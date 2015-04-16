/**
 * Created by filip on 3/18/15.
 */

'use strict';

var Schema = {
    $schema: 'http://json-schema.org/schema#',
    type: 'object',
    definitions: {
        schemaDef: {
            type: 'array',
            minItems: 1,
            items: {
                oneOf: [
                    {
                        type: 'object',
                        properties: {
                            type: {
                                $ref: '#/definitions/stringTypeDef'
                            }
                        },
                        required: ['type']
                    },
                    {
                        $ref: '#/definitions/enumDef'
                    },
                    {
                        $ref: '#/definitions/arrayDef'
                    },
                    {
                        $ref: '#/definitions/stringTypeDef'
                    },
                    {
                        $ref: '#/definitions/recordDef'
                    }
                ]
            }
        },
        stringTypeDef: {
            type: 'string',
            enum: ['string', 'boolean', 'File','file', 'float', 'int', 'null']
        },
        enumDef: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['enum']
                },
                name: {
                    type: 'string'
                },
                symbols: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            },
            required: ['type', 'name', 'symbols']
        },
        arrayDef: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['array']
                },
                items: {
                    oneOf: [
                        {
                            type: 'object',
                            properties: {
                                type: {
                                    $ref: '#/definitions/stringTypeDef'
                                }
                            },
                            required: ['type']
                        },
                        {
                            $ref: '#/definitions/recordDef'
                        }
                    ]
                }
            },
            required: ['type', 'items']
        },
        recordDef: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['record']
                },
                fields: {
                    $ref: '#/definitions/fieldsDef'
                }
            },
            required: ['type', 'fields']
        },
        fieldsDef: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: {
                        $ref: '#/definitions/schemaDef'
                    },
                    name: {
                        type: 'string'
                    },
                    adapter: {
                        type: 'object'
                    }
                },
                required: ['type', 'name']
            }
        },
        adapterDef: {
            type: 'object',
            properties: {
                position: {
                    type: 'number'
                },
                argValue: {
                    oneOf: [
                        {
                            type: ['string', 'number']
                        },
                        {
                            type: 'object',
                            properties: {
                                '@type': {
                                    type: 'string'
                                },
                                lang: {
                                    type: 'string'
                                },
                                value: {
                                    type: 'string'
                                }
                            }
                        }
                    ]
                },
                separator: {
                    type: 'string'
                },
                prefix: {
                    type: 'string'
                }
            }
        }
    },
    properties: {
        '@id': {
            type: 'string'
        },
        '@type': {
            type: 'string',
            enum: ['Workflow']
        },
        '@context': {
            type: 'string'
        },
        label: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        dataLinks: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    destination: {
                        type: 'string'
                    },
                    source: {
                        type: 'string'
                    }
                },
                required: ['destination', 'source']
            }
        },
        steps: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    app: {
                        oneOf: [{
                            type: 'object',
                            properties: {},
                            required: []
                        }, {
                            type: 'string'
                        }]
                    },
                    '@id': {
                        type: 'string',
                        format: 'validateId'
                    },
                    inputs: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                '@id': {
                                    type: 'string',
                                    format: 'validateId'
                                }
                            },
                            required: ['@id']
                        }
                    },
                    outputs: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                '@id': {
                                    type: 'string',
                                    format: 'validateId'
                                }
                            },
                            required: ['@id']
                        }
                    }
                },
                required: ['inputs', 'outputs', '@id', 'app']
            }
        },
        inputs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    schema: {
                        $ref: '#/definitions/schemaDef'
                    },
                    '@id': {
                        type: 'string',
                        format: 'validateId'
                    },
                    depth: {
                        type: 'number'
                    },
                    name: {
                        type: 'string'
                    },
                    adapter: {
                        $ref: '#/definitions/adapterDef'
                    }
                },
                required: ['schema', '@id', 'depth']
            }
        },
        outputs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    '@id': {
                        type: 'string',
                        format: 'validateId'
                    },
                    depth: {
                        type: 'number'
                    },
                    schema: {
                        $ref: '#/definitions/schemaDef'
                    }
                },
                required: ['schema', '@id', 'depth']
            }
        }
    },
    required: ['@id', '@type', '@context', 'label', 'inputs', 'outputs']
};

/**
 * Shared code with node
 */
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Schema;
} else if (typeof angular !== 'undefined') {
    angular.module('registryApp.common')
        .constant('workflowSchemaDefs', Schema);
}
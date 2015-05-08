/**
 * Created by filip on 9.10.14..
 */
'use strict';

angular.module('registryApp.app')
    .controller('WorkflowEditorCtrl', ['$scope', '$rootScope', '$q', '$modal', '$templateCache', 'Loading', 'App', 'User', 'Repo', 'Const', 'BeforeRedirect', 'Helper', 'PipelineService', 'lodash', 'Globals', 'BeforeUnload', 'Api', 'HotkeyRegistry', 'Chronicle', 'Notification', function ($scope, $rootScope, $q, $modal, $templateCache, Loading, App, User, Repo, Const, BeforeRedirect, Helper, PipelineService, _, Globals, BeforeUnload, Api, HotkeyRegistry, Chronicle, Notification) {
        var PipelineInstance = null,
            prompt = false,
            onBeforeUnloadOff = BeforeUnload.register(function() { return 'Please save your changes before leaving.'; }, function() {return prompt});

        $scope.$on('pipeline:change', function() {
            prompt = true;
        });

        $scope.view = {};

        /* expose Globals to template */
        $scope.view.globals = Globals;

        /* workflow mode: new or edit */
        $scope.view.mode = 'edit';

        /* loading state of the page */
        $scope.view.loading = true;

        /* current tab for the right sidebar */
        $scope.view.tab = 'apps';

        /* current workflow */
        $scope.view.workflow = {};

        /* group visibility flags for repos */
        $scope.view.groups = {
            myRepositories: false,
            otherRepositories: false
        };

        /* visibility flags for repo groups that hold apps */
        $scope.view.repoGroups = {};

        $scope.view.repoTypes = {
            MyApps: {},
            PublicApps: {}
        };

        /* list of my repos */
        $scope.view.MyApps = {};

        /* list of other repos */
        $scope.view.PublicApps = {};

        /* list of user repos*/
        $scope.view.userRepos= [];

        /* flag if something is changed: params or workflow */
        $scope.view.isChanged = false;

        /* flag when save is clicked */
        $scope.view.saving = false;

        /* flag for sidebar visibility */
        $scope.view.showSidebar = true;

        $scope.view.classes = ['page', 'workflow-edit'];
        Loading.setClasses($scope.view.classes);

        $scope.Loading = Loading;

        $scope.view.searchTerm = '';

//        $scope.view.appRevisions = {};

        /**
         * Set controller id for pipeline Service to use it
         *
         * @type {string}
         */
        $scope.view.id = 'workflowEditorCtrl';

        $scope.$watch('Loading.classes', function (n, o) {
            if (n !== o) {
                $scope.view.classes = n;
            }
        });

        PipelineService.register($scope.view.id, function () {
            PipelineInstance = PipelineService.getInstance($scope.view.id);

            console.log('Pipeline Instance cached', PipelineInstance);
        });

        $q.all([
                User.getUser()
//                Repo.getRepos(0, '', true)
            ]).then(function(result) {
                $scope.view.user = result[0].user;
//                $scope.view.userRepos = result[1].list;
            });

        var toggleState = true;

        var toggleAll = function () {

            _.forEach($scope.view.repoTypes.MyApps, function (obj, repo) {
                $scope.view.repoGroups[repo] = toggleState;
            });

            _.forEach($scope.view.repoTypes.PublicApps, function (obj, repo) {
                $scope.view.repoGroups[repo] = toggleState;
            });

            $scope.view.groups.MyApps = toggleState;
            $scope.view.groups.PublicApps = toggleState;

            toggleState = !toggleState;

        };

        $scope.resetSearch = function () {
            $scope.view.searchTerm = '';
            toggleState = false;
            toggleAll();
        };

        $scope.$watch('view.searchTerm', function (newVal,oldVal) {

            if (oldVal !== newVal) {

                if (newVal === '') {
                    $scope.resetSearch();
                } else {
                    toggleState = true;
                    toggleAll();
                }
            }

        });

        /**
         * Callback when apps are loaded
         *
         * @param {Object} result
         */
        var appsLoaded = function (result) {
            $scope.view.filtering = false;
            $scope.view.message = result[0].status;

            $scope.view.repoTypes.MyApps = result[0].message;
            $scope.view.repoTypes.PublicApps = result[1].message;

            $scope.view.workflow = result[2].message;

            $scope.view.loading = false;
        };

//        $scope.toggleAppRevisions = function (rev) {
//            $scope.view.appRevisions[rev].toggled = !$scope.view.appRevisions[rev].toggled;
//        };

        /* load tools/workflows grouped by repositories */
        $q.all([
            App.getMineAppsByProject(),
            App.getPublicAppsByProject(),
            App.get()
        ]).then(appsLoaded);

        /**
         * Switch tab on the right side
         *
         * @param {string} tab
         */
        $scope.switchTab = function (tab) {
            $scope.view.tab = tab;
        };

        /**
         * Toggle top level groups
         * @param group
         */
        $scope.toggleGroup = function (group) {
            $scope.view.groups[group] = !$scope.view.groups[group];
        };

        /**
         * Toggle repo list visibility
         *
         * @param repo
         */
        $scope.toggleRepo = function (repo) {
            if (_.isUndefined($scope.view.repoGroups[repo])) {
                $scope.view.repoGroups[repo] = false;
            }
            $scope.view.repoGroups[repo] = !$scope.view.repoGroups[repo];
        };

        /**
         * Callback when workflow is changed
         */
        $scope.onWorkflowChange = function (value) {
            $scope.view.isChanged = value.value;

            if (!value.value) {
                $scope.view.saving = false;
                $scope.view.loading = false;

                $scope.view.currentAppId = null;
                $scope.view.json = {};
            }

            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        /**
         * Initiate workflow save
         */
        $scope.save = function () {

            if (!$scope.view.isChanged) {
                Notification.error('Pipeline not updated: Graph has no changes.');
                return;
            }

            BeforeRedirect.setReload(true);
            $scope.view.saving = true;
            $scope.view.loading = true;


            var workflow = PipelineInstance.format();
            App.update(workflow, 'workflow').then(function(data) {

                var rev = data.message['sbg:revision'];
                Notification.primary('Pipeline successfully updated.');
                redirectTo(rev);
            });
        };

        $scope.toggleSidebar = function() {

            $scope.view.showSidebar = !$scope.view.showSidebar;
//            $rootScope.$broadcast('sidebar:toggle', $scope.view.showSidebar);
            PipelineInstance.adjustSize($scope.view.showSidebar);

        };

        /**
         * Check if particular property is not exposed anymore and remove it from values schema list
         *
         * @param {string} appName
         * @param {string} key
         */
        $scope.onExpose = function (appName, key) {

            if (!_.isUndefined($scope.view.values[appName]) && !_.isUndefined($scope.view.values[appName][key])) {

                $scope.view.suggestedValues[appName + Const.exposedSeparator + key.slice(1)] = $scope.view.values[appName][key];
                delete $scope.view.values[appName][key];
            }

            if (!_.isUndefined($scope.view.values[appName]) && _.isEmpty($scope.view.values[appName])) {
                delete $scope.view.values[appName];
            }

            console.log($scope.view.suggestedValues);
            console.log($scope.view.exposed);
            console.log($scope.view.values);

            $scope.onWorkflowChange({value: true, isDisplay: false});

        };
        
        $scope.onUnExpose = function (appName, key, value) {
            var keyName = appName + Const.exposedSeparator + key.slice(1);

            if ($scope.view.suggestedValues[keyName]) {
                delete $scope.view.suggestedValues[keyName];
            }

            if (value) {

                if (typeof $scope.view.values[appName] === 'undefined') {
                    $scope.view.values[appName] = {};
                }

                $scope.view.values[appName][key] = value;

            }
        };

        // think about this when implementing multi select of nodes
        var deepNodeWatch;
        /**
         * Track node select
         */
        var onNodeSelect = function (e, model, exposed, values, suggestedValues) {

            $scope.view.json = model;

            $scope.view.values = values;
            $scope.view.exposed = exposed;
            $scope.view.suggestedValues = suggestedValues;

            $scope.view.required = $scope.view.json.inputs.required;

            // TODO: think about this when implementing multi select of nodes
            deepNodeWatch = $scope.$watch('view.values', function (n, o) {
                if (n !== o) {
                    $scope.onWorkflowChange({value: true, isDisplay: false});
                }
            } , true);

            $scope.switchTab('params');
            $scope.$digest();
        };

        /**
         * Track node deselect
         */
        var onNodeDeselect = function () {

            $scope.view.json = {};

            if (typeof deepNodeWatch === 'function') {
                // turn off deep watch for node model
                deepNodeWatch();
            }

            $scope.switchTab('apps');
            $scope.$digest();
        };

        /**
         * redirects to a specific revision
         * @param revisionId
         */
        var redirectTo = function(revisionId) {
            prompt = false;
            window.location = '/rabix/u/' + Globals.projectOwner + '/' + Globals.projectSlug + '/apps/' + Globals.appName + '/edit?type=' + Globals.appType + '&rev=' + revisionId;
        };

        var onNodeSelectOff = $rootScope.$on('node:select', onNodeSelect);
        var onNodeDeselectOff = $rootScope.$on('node:deselect', onNodeDeselect);

        var onBeforeRedirectOff = BeforeRedirect.register(function () {

            var deferred = $q.defer();

            if ($scope.view.mode === 'new') {
                $scope.$broadcast('save-local', true);
            }

            deferred.resolve();

            return deferred.promise;

        });

        /**
         * Toggle dropdown menu
         */
        $scope.toggleMenu = function() {

            $scope.view.isMenuOpen = !$scope.view.isMenuOpen;

        };

        $scope.view.capitalize = function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        };

        /**
         * Load markdown modal for description edit
         */
        $scope.loadMarkdown = function() {

            var modalInstance = $modal.open({
                template: $templateCache.get('views/partials/markdown.html'),
                controller: 'MarkdownCtrl',
                windowClass: 'modal-markdown',
                size: 'lg',
                backdrop: 'static',
                resolve: {data: function () {return {markdown: $scope.view.workflow.description};}}
            });

            modalInstance.result.then(function(result) {
                $scope.view.workflow.description = result;
            });
        };

        $scope.editMetadata = function () {

            var modalInstance = $modal.open({
                template: $templateCache.get('views/dyole/edit-metadata.html'),
                controller: 'DyoleEditMetadataCtrl',
                windowClass: 'modal-markdown',
                size: 'lg',
                backdrop: 'static',
                resolve: {data: function () {return {tool: $scope.view.workflow};}}
            });

            modalInstance.result.then(function(result) {
                $scope.view.workflow = result;
            });

        };

        $scope.runWorkflow = function () {
            // create task and redirect to task page for that task
        };

        /**
         * Load json importer
         */
        $scope.loadJsonImport = function() {

            var modalInstance = $modal.open({
                template: $templateCache.get('views/cliche/partials/json-editor.html'),
                controller: 'JsonEditorCtrl',
                resolve: { options: function () { return {user: $scope.view.user, type: 'workflow'}; }}
            });

            modalInstance.result.then(function (json) {

                if (json) {
                    json = JSON.parse(json);
                    $scope.view.workflow = json;
                }
            });

        };

        /**
         * Switch to another revision of the app
         */
        $scope.changeRevision = function() {

            var deferred = $q.defer();

            Api.getLatest.get().$promise.then(function(result) {
                var latestRevision = result.message['sbg:revision'];
                var revisionsList = _.range(latestRevision + 1);

                var modalInstance = $modal.open({
                    template: $templateCache.get('views/cliche/partials/revisions.html'),
                    controller: ['$scope', '$modalInstance', 'data', function ($scope, $modalInstance, data) {

                        $scope.view = data;

                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel');
                        };

                        $scope.choose = function(id) {
                            $modalInstance.close(id);
                        };

                    }],
                    size: 'sm',
                    windowClass: 'modal-revisions',
                    resolve: {data: function () {return {revisions: revisionsList, workflow: $scope.view.workflow, current: $scope.view.workflow['sbg:revision']};}}
                });

                modalInstance.result.then(function (revisionId) {
                    redirectTo(revisionId);

                    // to indicate that something is happening while the page redirects
                    $scope.view.loading = true;
                });

                deferred.resolve(modalInstance);
            });


            return deferred.promise;

        };

        $scope.validateWorkflowJSON = function () {

            PipelineInstance.validate().then(function (workflow) {
                $modal.open({
                    template: $templateCache.get('views/dyole/json-modal.html'),
                    controller: 'ModalJSONCtrl',
                    resolve: {data: function () {
                        return {json: workflow.errors, url: false};
                    }}
                });
            });

        };

        $scope.workflowToJSON = function () {
            var workflow = PipelineInstance.format();

            var modal = $modal.open({
                template: $templateCache.get('views/dyole/json-modal.html'),
                controller: 'ModalJSONCtrl',
                resolve: {data: function () {
                    return {json: workflow};
                }}
            });

            modal.result.then(function () {
                PipelineInstance.getUrl({url: App.getAppUrl()});
            });
        };

        //$scope.chron = Chronicle.record('view.workflow', $scope, true);

        $scope.undoAction = function () {
            // undo action
        };

        $scope.redoAction = function () {
            // redo action;
        };

        $scope.view.canUndo = function () {
            return $scope.chron ? $scope.chron.currArchivePos > 1 : false;
        };
        $scope.view.canRedo = function () {
            return $scope.chron ? $scope.chron.currArchivePos !== $scope.chron.archive.length - 1 : false;
        };

        var unloadHotkeys = HotkeyRegistry.loadHotkeys([
            {name: 'save', callback: $scope.save, preventDefault: true},
            {name: 'run', callback: $scope.runWorkflow, preventDefault: true},
            {name: 'undo', callback: $scope.undoAction, preventDefault: true},
            {name: 'redo', callback: $scope.redoAction, preventDefault: true}
        ]);

        // File store cache
        var fileCache;

        $scope.openFilePicker = function () {

            var modalInstance = $modal.open({
                template: $templateCache.get('views/partials/choose-file.html'),
                controller: 'ChooseFileCtrl',
                size: 'lg',
                windowClass: 'file-picker-modal'
            });

            modalInstance.result.then(function (result) {
                console.log('*** Files Chosen: ', result);
            });
        };


        $scope.$on('$destroy', function () {
            onNodeSelectOff();
            onNodeDeselectOff();

            onBeforeRedirectOff();
            onBeforeRedirectOff = undefined;

            onBeforeUnloadOff();
            onBeforeUnloadOff = undefined;

            unloadHotkeys();

            PipelineService.removeInstance($scope.view.id);

        });

    }]);

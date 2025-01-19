/**
 * jqFinder - A Directory Browser Plugin for jQuery
 * Author: M. Hamit Yanik, August 2022
 */
(function ($) {

    //My description
    function JQFinder(el, options) {
        //Defaults:
        this.defaults = {
            placeholder: "Choose a file",
            popoverTitle: "Browse Directory",
            browseBtn: null,
            connector: "connector.php",
            initialPath: "",
            contentWidth: 400,
            contentHeight: 300,
            contentMinHeight: null,
            contentMaxHeight: null,
            easing: null,
            speed: 300,
            autoHide: true,
            readOnly: false,
            extensionsOnly: null,
            allowFileSelectOnly: true,
            colorizeByExtension: false,
            queryString: {},
            leadingSlash: false,
            directoryTrailingSlash: true,
            folderIcon: "fa fa-folder",
            folderIconOpen: "fa fa-folder-open",
            fileIcons: {
                ".html": "fab fa-html5",
                ".js": "fab fa-js-square",
                ".png": "fa fa-image",
                ".gif": "fa fa-image",
                ".jpg": "fa fa-image",
                ".webp": "fa fa-image",
                ".avif": "fa fa-image",
                ".mp4": "fa fa-film",
                ".webm": "fa fa-film",
                ".ogv": "fa fa-film",
                ".css": "fab fa-css3",
                ".ico": "fa fa-icons",
                ".pdf": "fa fa-file-pdf",
                ".txt": "fa fa-file-alt",
                ".json": "fa fa-code",
            },
        };

        //Extending options:
        this.opts = $.extend({}, this.defaults, options);

        //Privates:
        this.$el = $(el);

        this.currentPane = null;
        this.pathBag = [];
        this.params = {
            preventClicks: false,
            selectionMade: false,
            inputHeight: 0,
            elOffsetX: 0,
            elOffsetY: 0,
            paneDepth: 0,
            firstInit: false,
        }
    }

    // Separate functionality from object creation
    JQFinder.prototype = {

        init: function () {
            const _this = this;
            let $elVal = _this.$el.val();

            // Set the placeholder of input-box
            _this.$el.attr("placeholder", this.opts.placeholder);

            if (_this.opts.readOnly) {
                _this.$el.prop("readonly", true);
            }

            if ($elVal !== "") {
                _this.params.selectionMade = true;
            }

            if (_this.opts.easing !== null && (!$.easing || !$.easing.hasOwnProperty(_this.opts.easing))) {
                console.warn('jq-finder: Easing method "' + _this.opts.easing + '" is not available. Make sure that the jquery.easing plugin is included on the page.');
                _this.opts.easing = null;
            }

            if (this.opts.browseBtn === null) {
                _this.$el.focus(function () {
                    _this.start();
                }).click(function (e) {
                    e.stopPropagation();
                });
            } else {
                $(this.opts.browseBtn).click(function (e) {
                    e.stopPropagation();
                    _this.start();
                });
            }

            $("html").click(function () {
                _this.hidePopover();
            });

            $(window).resize(function () {
                _this.hidePopover();
            });
        },

        start: function () {
            const _this = this;

            if (this.popoverObj) {
                this.showPopover();
                this.printPath();
            } else {
                this.createPopover();
                this.showSpinner();
                this.loadPath(this.processPath(this.$el.val() || this.opts.initialPath), function (data, path) {
                    const content = _this.processData(data);
                    _this.increasePath(path);
                    _this.createPane(content, 'r');
                    _this.hideSpinner();
                    _this.setNavigationBtn();
                });
            }
        },

        createPopover: function () {
            const _this = this;
            _this.popoverObj = $('<div class="jq-finder-popover">' +
                '<div class="arrow"></div>' +
                '<div class="jq-finder-popover-header">' +
                '<h3 class="jq-finder-popover-title">' + _this.opts.popoverTitle + "</h3>" +
                '<a class="jq-finder-popover-close"><span class="fa fa-times-circle"></a>' +
                '</div>' +
                '<div class="jq-finder-popover-toolbar">' +
                '<div class="jq-finder-popover-tools"><div class="btn-group btn-group-sm">' +
                '<button class="btn btn-primary btn-sm jq-finder-back"><span class="fa fa-arrow-circle-left"></span> Back</button>' +
                '<button class="btn btn-primary btn-sm jq-finder-forward"><span class="fa fa-arrow-circle-right"></span></button>' +
                '</div></div>' +
                '<div class="jq-finder-popover-filter"><input class="form-control form-control-sm jq-finder-filter" placeholder="Filter items" type="text"></div>' +
                '</div>' +
                '<div class="jq-finder-popover-body"></div>' +
                '<div class="jq-finder-popover-footer">' +
                '<div class="jq-finder-popover-status"></div>' +
                '<div><span id="loading-spinner" style="display: none" class="fa fa-spinner fa-spin"></span></div>' +
                '</div></div>').hide();

            _this.jqContent = $("<div>").addClass("jq-finder-content-container").html('<div class="jq-finder-init">Initializing...</div>');

            _this.popoverObj.click(function (e) {
                e.stopPropagation();
            }).find(".jq-finder-popover-body").css({
                width: _this.opts.contentWidth,
                height: _this.opts.contentHeight,
                minHeight: _this.opts.contentMinHeight,
                maxHeight: _this.opts.contentMaxHeight,
            }).html(_this.jqContent);

            _this.closeBtn = _this.popoverObj.find("a.jq-finder-popover-close").click(function (e) {
                e.preventDefault();
                _this.hidePopover();
            });

            _this.backBtn = _this.popoverObj.find(".jq-finder-back").click(function (e) {
                e.preventDefault();
                if (_this.params.preventClicks) {
                    return;
                }

                _this.prevDir();
            });

            _this.fwdBtn = _this.popoverObj.find(".jq-finder-forward").prop("disabled", true).click(function (e) {
                e.preventDefault();
                if (_this.params.preventClicks) {
                    return;
                }

                _this.fwdPane();
            });

            $("body").append(_this.popoverObj);
            _this.showPopover();
        },

        showPopover: function () {
            // Hide other open popovers
            $(".jq-finder-instance").each(function () {
                const instance = $(this).data("jq-finder");
                const instanceElem = instance.$el;
                if (!instanceElem.is(":focus")) {
                    instance.hidePopover();
                }
            });

            const arrowHeight = this.popoverObj.children(".arrow").height();

            const elOffset = this.$el.offset();
            this.params.elOffsetX = elOffset.left;
            this.params.elOffsetY = elOffset.top;

            this.params.inputHeight = this.$el.outerHeight();

            this.popoverObj
                .stop()
                .css({
                    top: this.params.elOffsetY + this.params.inputHeight,
                    left: this.params.elOffsetX,
                })
                .show()
                .animate({
                    top: (this.params.elOffsetY + arrowHeight + this.params.inputHeight) + "px",
                    opacity: 1
                }, 200);
        },

        hidePopover: function () {
            if (!this.popoverObj || this.popoverObj.is(':hidden')) {
                return;
            }

            if (!this.params.selectionMade) {
                this.$el.val("");
            }

            // De-focus from input element
            this.$el.blur();

            this.popoverObj.stop().animate({
                top: this.params.elOffsetY + this.params.inputHeight,
                opacity: 0
            }, 200, function () {
                $(this).hide();
            });
        },

        loadPath: function (dir, fn) {
            const _this = this;

            const path = this.getPath(dir);

            $.ajax({
                url: this.opts.connector,
                data: {"path": path},
                dataType: "json",
            }).done(function (data) {
                /** @var data.status.requestPath */
                /** @var data.status.isDir */
                /** @var data.status.isFile */
                /** @var data.status.dirname */
                /** @var data.status.exception */
                /** @var data.files[] */
                /** @var data.directories[] */
                if (!data.status.isDir && data.status.isFile) {
                    _this.loadPath(data.status.dirname, fn);
                    return;
                }

                fn(data, dir);
            });
        },

        showSpinner: function () {
            //this.params.preventClicks = true;
            this.popoverObj.find("#loading-spinner").show();
        },

        hideSpinner: function () {
            const _this = this;
            setTimeout(function () {
                _this.popoverObj.find("#loading-spinner").hide();
            }, 250);
            //_this.params.preventClicks = false;
        },

        increasePath: function (path) {
            const _this = this;
            if (path && path !== '/') {
                path.split("/").filter(item => item).forEach(function (item) {
                    _this.pathBag.push(item);
                });
            }
        },

        decreasePath: function () {
            this.pathBag.length && this.pathBag.pop();
        },

        getCurrentPath: function () {
            return this.pathBag.join("/");
        },

        getCurrentPathLevel: function () {
            return this.pathBag.length;
        },

        getPath: function (dir, path = null) {
            if (path === null) {
                path = this.getCurrentPath();
            }
            return [path, dir].filter(item => item).join("/");
        },

        getPrevPath: function () {
            return this.hasPath() ? this.pathBag.slice(0, -1).join("/") : "";
        },

        hasPath: function () {
            return this.pathBag.length && 1;
        },

        processPath: function (path) {
            const [pathString,] = path.split('?');
            return pathString.split('/').filter(item => item).join('/');
        },

        getBasenameFromPath: function (path) {
            // Return the last element of path string
            return path.split("/").pop();
        },

        processData: function (data) {
            const _this = this;

            const list = $("<ul></ul>").css({width: _this.opts.contentWidth}).data("status", data.status);

            $.each(data.directories, function (key, item) {
                list.append('<li><a href="#" data-child-dir="' + item + '"><span class="' + _this.opts.folderIcon + '"></span>' + item + '</a></li>');
            });

            $.each(data.files, function (key, item) {
                const extension = item.slice(item.lastIndexOf("."));
                const icon = _this.opts.fileIcons[extension] || "fa fa-file";

                if (_this.opts.extensionsOnly === null || $.inArray(extension, _this.opts.extensionsOnly) > -1) {
                    let color = _this.opts.colorizeByExtension ? ' style="color: ' + _this.stringToColour(extension) + '"' : '';
                    list.append('<li><a href="#" data-file="' + item + '"' + color + '><span class="' + icon + '"></span>' + item + '</a></li>');
                } else {
                    list.append('<li><a href="#" class="disabled"><span class="' + icon + '"></span>' + item + '</a></li>');
                }
            });

            if (!_this.opts.allowFileSelectOnly) {
                list.prepend('<li><a href="#" data-dir="' + data.status.requestPath + '" title="Select current directory: ' + data.status.requestPath + '"><span class="' + _this.opts.folderIconOpen + '"></span>.</a></li>');
            }

            // If no directories or files returned
            if (data.status.itemCount === 0) {
                list.append('<li class="jq-finder-dir-empty">Directory empty</li>');
            }

            // If no directories or files returned
            if (data.status.exception !== undefined) {
                list.append('<li class="jq-finder-exception">' + data.status.exception + '</li>');
            }

            list.find("a").click(function (e) {
                e.preventDefault();

                if (_this.params.preventClicks) {
                    return;
                }

                if ($(this).hasClass("disabled")) {
                    return;
                }

                const nextDir = $(this).data("child-dir");
                nextDir && _this.nextDir(nextDir);

                const file = $(this).data("file");
                file && _this.selectFile(file);

                const dir = $(this).data("dir");
                (dir !== undefined) && _this.selectDir(dir);
            });

            return list;
        },

        nextDir: function (directory) {
            const _this = this;

            directory = directory.toString();

            this.params.preventClicks = true;

            if (_this.currentPane) {
                const nextPane = _this.currentPane.next();

                if (nextPane.length) {
                    if (nextPane.data("path") === _this.getPath(directory)) {
                        // If next dir is loaded already slide to it.
                        _this.currentPane = nextPane;
                        _this.increasePath(directory);
                        _this.increasePaneDepth();
                        return;
                    } else {
                        // If next path is different, clear next panes that created before.
                        _this.currentPane.nextAll().remove();
                    }
                }
            }

            _this.showSpinner();
            _this.loadPath(directory, function (data, dir) {
                const content = _this.processData(data);
                _this.increasePath(dir);
                _this.createPane(content, 'r');
                _this.hideSpinner();
            });
        },

        prevDir: function () {
            const _this = this;

            if (this.getCurrentPathLevel() > 0) {
                this.params.preventClicks = true;

                const prevPane = this.currentPane.prev();

                if (prevPane.length) {
                    // If parent dir is already loaded slide to it.
                    this.decreasePath();
                    this.decreasePaneDepth();
                } else {
                    if (this.getCurrentPath() === this.opts.initialPath) {
                        this.params.preventClicks = false;
                        return;
                    }

                    // Load parent directory
                    this.showSpinner();
                    this.decreasePath();
                    this.loadPath('', function (data) {
                        const content = _this.processData(data);
                        _this.createPane(content, 'l');
                        _this.hideSpinner();
                    });
                }
            }
        },

        fwdPane: function () {
            const nextPane = this.currentPane.next();

            if (nextPane.length) {
                this.nextDir(this.getBasenameFromPath(nextPane.data("path")));
            }
        },

        // Create a hidden pane
        createPane: function (content, direction) {
            this.jqContent.children(".jq-finder-init").remove();

            const createdPane = $("<div>")
                .addClass("jq-finder-content-pane")
                .data("path", this.getCurrentPath())
                .hide()
                .append(content);

            switch (direction) {
                case 'r':
                    this.currentPane = createdPane;
                    this.jqContent.append(this.currentPane);
                    this.increasePaneDepth();
                    break;

                case 'l':
                    this.jqContent.prepend(createdPane);
                    this.decreasePaneDepth();
                    break;
            }
        },

        increasePaneDepth: function () {
            const _this = this;

            if (!_this.params.firstInit) {
                _this.createPaneCallback();
                _this.params.firstInit = true;
                return;
            }

            this.setNavigationBtn();

            // First, show the hidden pane
            _this.currentPane.show();
            _this.jqContent.animate({
                left: "-" + _this.opts.contentWidth + "px"
            }, _this.opts.speed, _this.opts.easing, function () {
                _this.currentPane.prev().removeClass("jq-finder-active-pane").hide();
                _this.jqContent.css({left: 0});
                _this.createPaneCallback();
            });
        },

        createPaneCallback: function () {
            this.currentPane.show().addClass("jq-finder-active-pane");

            this.printPath();
            this.updateItemsCount();
            this.attachFilter();
            this.contentScrollTop();

            this.params.preventClicks = false;
        },

        decreasePaneDepth: function () {
            const _this = this;

            const previousPane = _this.currentPane.removeClass("jq-finder-active-pane").prev().show();

            _this.jqContent.css({left: "-" + _this.opts.contentWidth + "px"}).animate({
                left: 0
            }, _this.opts.speed, _this.opts.easing, function () {
                _this.currentPane.hide();
                _this.currentPane = previousPane.addClass("jq-finder-active-pane");
                _this.printPath();
                _this.updateItemsCount();
                _this.attachFilter();
                _this.contentScrollTop();
                _this.setNavigationBtn();

                _this.params.preventClicks = false;
            });
        },

        updateItemsCount: function () {
            this.popoverObj.find(".jq-finder-popover-status").text(this.jqContent.find(".jq-finder-active-pane ul").data("status").itemCount + " items");
        },

        printPath: function () {
            if (!this.params.selectionMade) {
                this.setElementVal(this.getCurrentPath());
            }
        },

        selectFile: function (file) {
            const selectedFile = (this.hasPath() ? this.getCurrentPath() + "/" : "") + file;
            this.setElementVal(selectedFile);

            this.params.selectionMade = true;

            if (this.opts.autoHide) {
                this.hidePopover();
            }

            this.$el.trigger('jq-finder-select', {type: "file", path: selectedFile});
        },

        selectDir: function (dir) {
            //const selectedDir = this.hasPath() ? this.getCurrentPath() : "";
            this.setElementVal(dir, true)

            this.params.selectionMade = true;

            if (this.opts.autoHide) {
                this.hidePopover();
            }

            this.$el.trigger('jq-finder-select', {type: "dir", path: dir});
        },

        setElementVal: function (value, isDir = false) {
            let queryString = "";

            if (isDir && value && this.opts.directoryTrailingSlash) {
                queryString += "/";
            }

            if (typeof this.opts.queryString === "string") {
                queryString += this.opts.queryString;
            } else if (!$.isEmptyObject(this.opts.queryString)) {
                queryString += "?" + $.param(this.opts.queryString);
            }

            this.$el.val((this.opts.leadingSlash ? "/" : "") + value + queryString);
        },

        attachFilter: function () {
            const _this = this;
            _this.popoverObj.find(".jq-finder-content-pane ul li").show();
            _this.popoverObj.find(".jq-finder-filter").val("").off("keyup").on("keyup", function () {
                const value = $(this).val().toLowerCase();
                _this.popoverObj.find(".jq-finder-active-pane ul li").filter(function () {
                    $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
                });
            })
        },

        contentScrollTop: function () {
            this.jqContent.parent().animate({scrollTop: 0}, 200, this.opts.easing);
        },

        stringToColour: function (str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            let colour = '#';
            for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                const str = ('00' + value.toString(16));
                colour += str.substring(str.length - 2);
            }
            return colour;
        },

        setNavigationBtn: function () {
            this.backBtn.prop("disabled", !(this.getCurrentPathLevel() > 0));
            this.fwdBtn.prop("disabled", !(this.currentPane.next().length > 0));
        },
    };

    // The actual plugin
    $.fn.jqFinder = function (options) {
        if (this.length) {
            this.each(function () {
                const rev = new JQFinder(this, options);
                rev.init();
                $(this).addClass("jq-finder-instance").data('jq-finder', rev);
            });
        }

        return this;
    };
})(jQuery);
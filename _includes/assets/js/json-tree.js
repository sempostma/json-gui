function findPath(target) {
    var path = [];
    while (target.id !== 'tree') {
        if (target.classList.contains('node')) path.push(target);
        target = target.parentElement;
    }
    for (var i = 0; i < path.length - 1; i++) {
        path[i] = (path[i + 1].getAttribute('type') === 'array')
            ? Array.prototype.slice.call(path[i + 1].children[1].children).indexOf(path[i])
            : path[i].children[0].getElementsByClassName('title')[0].innerText;
        if (path[i] === -1) throw Error('Could not find path');
    }
    return path.reverse().slice(1);
}

function getTreeNode(tree, path) {
    var curr = tree;
    for (var i = 0; i < path.length; i++) {
        curr = curr[path[i]];
    }
    return curr;
}

(function () {

    function autosize() {
        setTimeout(function () {
            var w = (this.value || '').length > 20 ? 'width:100%' : 'auto';
            this.style.cssText = 'height:auto;' + w;
            this.style.cssText = 'height:' + this.scrollHeight + 'px;' + w;
        }.bind(this), 0);
    }

    window.JsonTree = function JsonTree(sel) {

        this.cbs = { change: [] };
        this.tree = {};
        var _this = this;

        function createDeltaFromPath(path, innerDelta, isArr) {
            var delta = {};
            var curs = delta;
            if (path.length > 0) {
                for (var i = 0; i < path.length - 1; i++) {
                    curs[(isArr ? path[i] : path[i] + '')] = {};
                    curs = curs[(isArr ? path[i] : path[i] + '')];
                }
                if (isArr) curs._t = 'a';
                curs[path[path.length - 1]] = innerDelta;
            } else return innerDelta;
            return delta;
        }

        $(sel).on('click', '.caret', function (e) {
            $(e.target).closest('.node.branch').toggleClass('clpsd');
        });

        $(sel).on('click', '.delete', function (e) {
            var path = findPath(e.target);
            var parent = getTreeNode(window.getPersistentValue(), path.slice(0, -1));
            var obj = getTreeNode(parent, [path[path.length - 1]]);
            // _this.setHtmlKeyNode(path, null, true); // use path without possible array prefix (which will be appended below)
            if (Array.isArray(parent))
                path[path.length - 1] = '_' + path[path.length - 1];
            var deleteDelta = createDeltaFromPath(path, [obj, 0, 0], Array.isArray(parent));
            $(e.target).closest('.node').remove();
            this.fireCb('change', [deleteDelta]);
        }.bind(this));

        // TODO: check all methods: { if property with same key already exists: display error }
        $(sel).add('#root-node-create').on('click', '.create', function (e) {
            var parentPath = $(this).attr('data-root') ? [] : findPath(e.target).slice(0);
            window.spawnNewElemModal(function (payload) {
                // { name: string, val: any, type: string }
                var parentObj = getTreeNode(window.getPersistentValue(), this);
                var newPath = Array.isArray(parentObj) ? this.concat(parentObj.length) : this.concat(payload.name);
                // var obj = getTreeNode(parent, [path[path.length - 1]]);// do check if key exists here
                console.log(payload)
                if (Array.isArray(parentObj) === false && parentObj[payload.name] !== undefined) {
                    alert('An item with the same name already exists.');
                    return false;
                }
                var insertDelta = createDeltaFromPath(newPath, [payload.val], Array.isArray(parentObj));
                _this.fireCb('change', [insertDelta]);
                _this.applyDelta(insertDelta, []);
                return true;
            }.bind(parentPath));
        });

        $(sel).on('focus', '.node-val', function (e) {
            $(e.target).attr('oldval', JSON.stringify($(e.target).val()));
        });

        $(sel).on('change', '.node-val, .change-type select', function (e) {
            var path = findPath(e.target);
            var type = $(e.target).closest('.node').attr('type');
            var oldval = JSON.parse($(e.target).attr('oldval'));
            var newval = $(e.target).val();
            // do type transforms
            switch (type) {
                case 'number':
                    if (!isNaN(parseFloat(newval))) {
                        newval = parseFloat(newval);
                        if (newval % 1 === 0) newval = parseInt(newval);
                    }
                    else $(e.target).closest('.node').find('.change-type select').val('string').trigger('change');
                    break;
                case 'boolean':
                    if (window.parseBool(newval) !== undefined) newval = window.parseBool(newval);
                    else $(e.target).closest('.node').find('.change-type select').val('string').trigger('change');
                    break;
                case 'null':
                    if (newval === 'null') newval = null;
                    else $(e.target).closest('.node').find('.change-type select').val('string').trigger('change');
                    break;
                default:
                    break;
            }
            var delta = createDeltaFromPath(path, [oldval, newval]);
            this.fireCb('change', [delta]);
        }.bind(this));

        $(sel).on('focus', '.change-type select', function (e) {
            $(e.target).attr('oldval', JSON.stringify($(e.target).val()));
            var val = $(e.target).closest('.node').find('.node-val').val();
            var options = $(e.target).find('option');
            options.eq(1).attr('disabled', isNaN(parseFloat(val)));
            options.eq(2).attr('disabled', window.parseBool(val) === undefined);
            options.eq(3).attr('disabled', val !== 'null');
        });

        $(sel).on('change', '.change-type select', function (e) {
            $(e.target).closest('.node').attr('type', $(e.target).val());
            $(e.target).closest('.node').find('.node-val').trigger('change');
        });

        $(sel).on('keydown', '.node-val', autosize);

        this.htmlElemMoved = function ($item, pathCamefrom, pathNow, jsonDocGraph) {
            var obj = getTreeNode(jsonDocGraph, pathCamefrom);
            var other = getTreeNode(jsonDocGraph, pathNow);
            var objParent = getTreeNode(jsonDocGraph, pathCamefrom.slice(0, -1));
            var otherParent = getTreeNode(jsonDocGraph, pathNow.slice(0, -1));
            if (objParent === otherParent) {
                // paths are equal this must be an array move
                var deltaProp = { '_t': 'a' };
                var fromIndex = pathCamefrom[pathCamefrom.length - 1];
                var toIndex = pathNow[pathNow.length - 1];
                if (fromIndex === toIndex) return;

                deltaProp['_' + fromIndex] = [other, toIndex, 3];
                var arrayMove = createDeltaFromPath(pathCamefrom.slice(0, -1), deltaProp);
                this.fireCb('change', [arrayMove]);
            }
            else {
                // this must be a move from branch(array/object) to other branch(array/object)
                if (Array.isArray(objParent))
                    pathCamefrom[pathCamefrom.length - 1] = '_' + pathCamefrom[pathCamefrom.length - 1];
                var deleteDelta = createDeltaFromPath(pathCamefrom, [obj, 0, 0], Array.isArray(objParent));
                this.fireCb('change', [deleteDelta]);
                var insertDelta = createDeltaFromPath(pathNow, [obj], Array.isArray(otherParent));
                this.fireCb('change', [insertDelta]);
            }
        };

        this.applyDelta = function (deltaRoot, path) {
            var t, delta, deltasQueue = [{ delta: deltaRoot, path: path }];
            while (deltasQueue.length > 0) {
                t = deltasQueue.pop();
                delta = t.delta;
                path = t.path;

                if (Array.isArray(delta)) {
                    if (delta[2] === 0) {
                        this.setNode(path, null, true); // delete value
                    } else if (delta.length == 2) {
                        this.setNode(path, delta[1]); // modified value
                    } else if (delta.length == 1) {
                        this.setNode(path, delta[0]); // add value
                    } else {
                        console.error('unrecognized delta', delta);
                    }
                } else {
                    for (var key in delta) {
                        var childDelta = delta[key];
                        if (delta.hasOwnProperty(key) && (key !== '_t' || delta['_t'] !== 'a')) {
                            if (delta._t === 'a') key = key.replace(/^_/, '');
                            deltasQueue.push({ delta: childDelta, path: path.concat(key) });
                        }
                    }
                }
            }
        };

        this.fireCb = function (name, params) {
            for (var i = 0; i < this.cbs[name].length; i++) {
                this.cbs[name][i].apply(this, params);
            }
        };

        this.on = function (event, cb) {
            this.cbs[event].push(cb);
        };

        this.remove = function (name, cb) {
            this.cbs[name].splidocument.createElement(this.cbs[name].indexOf(cb), 1);
        };

        this.setNode = function (path, obj, rm) {
            if (typeof (obj) === 'undefined') obj = null;
            if (rm) {
                console.log('remvoing', path, $(this.getHtmlKeyNode(path)).get(0));
                $(this.getHtmlKeyNode(path)).remove();
                // this.setHtmlKeyNode(path, null, true);
            }
            else {
                // build tree
                var node = this.getHtmlKeyNode(path);
                if (node && $(node).hasClass('root')) $(node).children('ul').empty();
                var generated = this.generateHtml(path, obj);
                if (node) {
                    node.parentElement.replaceChild(generated, node);
                } else {
                    $(this.getHtmlKeyNode(path.slice(0, -1))).children('ul, ol').get(0).appendChild(generated);
                }
            }
        };

        window.getHtmlKeyNode = this.getHtmlKeyNode = function (path) {
            var curr = document.getElementById('root-node');
            for (var i = 0; i < path.length; i++) {
                if (curr.getAttribute('type') === 'array') {
                    curr = curr.children[curr.children.length - 1].children[parseInt(path[i])];
                } else {
                    for (var ii = 0; ii < curr.children[curr.children.length - 1]/*ul(children)*/.children.length; ii++) {
                        console.log(curr.children[curr.children.length - 1]/*ul(children)*/.children[ii]
                            .children[0].getElementsByClassName('tree-node-title')[0]/* fast way to get to the title*/.innerText, path[i]);
                        if (curr.children[curr.children.length - 1]/*ul(children)*/.children[ii]
                            .children[0].getElementsByClassName('tree-node-title')[0]/* fast way to get to the title*/.innerText === path[i]) {
                            curr = curr.children[curr.children.length - 1]/*ul(children)*/.children[ii];
                            break;
                        }
                    }
                    if (ii === curr.children[curr.children.length - 1]/*ul(children)*/.children.length) return null;
                }
            }

            return curr;
        };
        // this.setHtmlKeyNode = function (path, node, rm) {
        //     if (path.length == 0) {
        //         this.htmlKeys = { node: $('#root-node').get(0) };
        //         return;
        //     }
        //     var curr = this.htmlKeys;
        //     for (var i = 0; i < path.length - 1; i++) {
        //         curr = curr['-' + path[i]];
        //     }
        //     if (rm) delete curr['-' + path[path.length - 1]];
        //     if (node) {
        //         curr['-' + path[path.length - 1]] = curr['-' + path[path.length - 1]] || {};
        //         curr['-' + path[path.length - 1]].node = node;
        //     }
        // };

        var selectPrefab = $(document.createElement('select')).addClass('change-type-select')
            .append($(document.createElement('option')).text('Text').val('string'))
            .append($(document.createElement('option')).text('Number').val('number'))
            .append($(document.createElement('option')).text('True or false').val('boolean'))
            .append($(document.createElement('option')).text('Nothing').val('null')).get(0);
        var realRoot = $('#tree > .root.node').get(0);
        var realRootUl = $('#tree > .root.node > ul').get(0);
        this.generateHtml = function (path, obj) {
            var node, name, head, move;
            if (path.length === 0) {
                node = document.createDocumentFragment();
                // this.setHtmlKeyNode(path, realRoot, true);
            }
            else {
                name = path[path.length - 1];
                node = document.createElement('li');
                head = document.createElement('span');
                head.className = 'head tree-node-head';
                node.appendChild(head);
                var title = document.createElement('span');
                title.className = 'title tree-node-title'
                    + (typeof (obj) === 'object' ? ' node-title-branch'
                        + (Array.isArray(obj) ? ' node-title-array' : '') : '');
                title.innerText = name;
                head.appendChild(title);
                move = document.createElement('span');
                move.className = 'move fa fa-arrows';
                head.appendChild(move);
                var del = document.createElement('span');
                del.className = 'delete fa fa-trash-o';
                head.appendChild(del);
                // this.setHtmlKeyNode(path, node, true);
            }
            if (typeof (obj) !== 'object') {
                node.className = 'node leaf';
                node.setAttribute('type', typeof (obj));
                var textarea = document.createElement('textarea');
                textarea.className = 'node-val';
                textarea.setAttribute('rows', 1);
                textarea.value = obj;
                // autosize.call(textarea);
                head.insertBefore(textarea, move);
                var changeType = document.createElement('span');
                changeType.className = 'change-type';
                var select = selectPrefab.cloneNode(true);
                select.value = typeof (obj);
                changeType.appendChild(select);
                head.insertBefore(changeType, move);
            } else {
                if (path.length === 0) {
                    $('#tree > .root.node').attr('type', Array.isArray(obj) ? 'array' : 'object');
                } else {
                    var add = document.createElement('span');
                    add.className = 'create fa fa-plus';
                    head.appendChild(add);
                    var caret = document.createElement('span');
                    caret.className = 'caret tree-node-caret';
                    head.insertBefore(caret, head.firstChild);
                    node.setAttribute('type', Array.isArray(obj) ? 'array' : 'object');
                    node.className = 'node branch';
                }
                var container;
                if (path.length === 0) {
                    container = node;
                } else {
                    container = document.createElement('ul');
                    container.className = 'node-children';
                    node.appendChild(container);
                }
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        container.appendChild(this.generateHtml(path.concat(key), obj[key]));
                    }
                }
            }
            if (path.length === 0) {
                realRootUl.appendChild(node);
                return realRoot;
            }
            else return node;
        };
    };
})();

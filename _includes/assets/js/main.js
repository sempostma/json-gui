// code graveyard

// // nav sticky

// $(document).ready(function () {
//     $("#navbar").sticky({ topSpacing: 0, zIndex: 1000 });
//     $('#filter-section').sticky({ topSpacing: 70, zIndex: 900 });
// });

// var parsleyOptions = {
//     successClass: "has-success",
//     errorClass: "has-error",
//     classHandler: function (el) {
//         return el.$element.closest(".form-group");
//     },
//     errorsWrapper: "<span class='help-block'></span>",
//     errorTemplate: "<span></span>"
// };

$.fn.hasScrollBar = function () {
    return this.get(0).scrollHeight > this.outerHeight();
};

// scroll guard

$.fn.scrollGuard2 = function () {
    return this
        .on('wheel', function (e) {
            var $this = $(this);
            if ($this.hasScrollBar() === false) {
                return true;
            }
            if (e.originalEvent.deltaY < 0) {
                /* scrolling up */
                return ($this.scrollTop() > 0);
            } else {
                /* scrolling down */
                return ($this.scrollTop() + $this.outerHeight() < $this[0].scrollHeight);
            }
        });
};

$(document).ready(function () {
    $('.dropdown-submenu > a, .dropdown-submenu-right > a').on('click', function (e) {
        $(this).next('ul').toggle();
        e.stopPropagation();
        e.preventDefault();
    });
});

// my lightbox

var $modal = $('#image-modal');

// Get the image and insert it inside the modal - use its "alt" text as a caption
var $img = $('.lightbox-image, .lightbox-container img');
var $modalImg = $modal.find('#image-modal-image');
var $captionText = $modal.find('#image-modal-caption');
$img.on('click', function () {
    $modal.css('display', 'block');
    $modalImg.get(0).src = $(this).attr('src') || $(this).css('background-image').match(/url\(["'](.+?)["']\)/)[1];
    $captionText.html(this.alt);
});

var $close = $modal.find('.close');

$close.on('click', function () {
    $modal.css('display', 'none');
});

// application

(function () {
    var useTabs = false;
    var indentUnit = 4;

    var jsonTree = new window.JsonTree('#tree');

    var persistentValStr = localStorage.getItem('persistentVal') || JSON.stringify({
        'ID': 'SGML',
        'SortAs': 'SGML',
        'GlossTerm':
            'Standard Generalized Markup Language',
        'Acronym': 'SGML',
        'Abbrev': 'ISO 8879:1986',
        'GlossDef': {
            'para': 'A meta-markup language, used to create markup languages such as DocBook.',
            'GlossSeeAlso': ['GML', 'XML']
        },
        'GlossSee': 'markup'
    });
    var persistentVal = JSON.parse(persistentValStr);
    var initialVal = window.jsondiffpatch.clone(persistentVal);
    var myCodeMirror = window.CodeMirror(document.getElementById('json'), {
        value: persistentValStr,
        mode: { name: 'javascript', json: true },
        indentWithTabs: useTabs,
        tabSize: indentUnit,
        indentUnit: indentUnit,
    });
    var $patchOutput = $('#json-patch-output');
    var $jsonPatchContainer = $('#json-patch-container');
    var $msgDelta = $('#msg-delta');

    jsonTree.setNode([], persistentVal);

    var timeout;
    var patchesHistory = [];
    var undoHistory = [];

    $('#edit-undo').on('click', function (e) {
        if (patchesHistory.length === 0) return;
        var reverseDelta = jsondiffpatch.reverse(patchesHistory.pop());
        undoHistory.push(reverseDelta);
        persistentVal = jsondiffpatch.patch(persistentVal, reverseDelta);

        persistentValStr = JSON.stringify(persistentVal, null, indentUnit);
        myCodeMirror.setValue(persistentValStr);
        jsonTree.applyDelta(reverseDelta, []);
        recordDelta(reverseDelta);
    });

    $('#edit-redo').on('click', function (e) {
        if (undoHistory.length === 0) return;
        var reverseDelta = jsondiffpatch.reverse(undoHistory.pop());
        patchesHistory.push(reverseDelta);
        persistentVal = jsondiffpatch.patch(persistentVal, reverseDelta);

        persistentValStr = JSON.stringify(persistentVal, null, indentUnit);
        myCodeMirror.setValue(persistentValStr);
        jsonTree.applyDelta(reverseDelta, []);
        recordDelta(reverseDelta);
    });

    $('#nav-generate-patch').on('click', function () {
        window.formInputModal('Generate patch', '\
<label title="This will attempt to combine patch files. Which will reduce the file size. \
If you uncheck this option you will get a patch file with every change since the last patch reset/start">\
<input type="checkbox" name="merge"> Merge patches</label>', false, function (result) {
                if (result !== false) {
                    logPatches(result.merge === 'on');
                    $jsonPatchContainer.css('display', 'block');
                    setTimeout(function () {
                        $('html, body').animate({ scrollTop: $jsonPatchContainer.offset().top - 64 }, '100');
                    }, 0);
                }
            });
    });

    $('#nav-reset-history').on('click', function () {
        window.confirmModal('Are you sure?', 'Do you really want to remove all history? \
The editor will reset to the current state. You will not be able to ctrl+z back. \
Patch history will be removed', 'Ok', 'Cancel', function (isConfirmed) {
                if (isConfirmed) {
                    patchesHistory = [];
                    undoHistory = [];
                    $patchOutput.attr('class', 'language-json');
                    $patchOutput.empty();
                    $jsonPatchContainer.css('display', 'none');
                }
            });
    });

    $('#nav-generate-schema').parent().find('ul > li > a').on('click', function () {
        var target = this.id.replace('nav-generate-schema-', '');
        var args = [persistentVal];
        if ('mysql-json-clickhouse'.indexOf(target) !== -1) {
            var targetCapitalized = target[0].toUpperCase() + target.slice(1);
            window.formInputModal(targetCapitalized + ' Schema name',
                '<input required name="name" placeholder="Name of ' + target + ' schema' + '" type="text" style="width:100%">',
                false, function (result) {
                    if ('clickhouse'.indexOf(target) !== -1) args.push(new Date());
                    if (result.name) {
                        args.unshift(result.name);
                        writeSchema(target, window.jsonSchema[target].apply(window.jsonSchema[target], args));
                    } else {
                        writeSchema(target, window.jsonSchema[target].apply(window.jsonSchema[target], args));
                    }
                });
        }
        else writeSchema(target, window.jsonSchema[target].apply(window.jsonSchema[target], args));
    });

    $('#nav-file-save-online').on('click', function () {
        $.ajax({
            url: 'https://api.myjson.com/bins',
            type: 'POST',
            data: persistentValStr,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                window.modalAlert('<span class="text-success">Success!</span>',
                    'JSON file saved was saved <a href="' + data.uri + '" target="_blank">here</a>.');
            },
            error: function () {
                window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to save file online.');
            }
        });
    });

    $('#nav-file-save-disk').on('click', function () {
        window.formInputModal('Save file on disk',
            '<label for="_t_savefile-filename">Filename:</label>\
<div class="form-group">\
<input required id="_t_savefile-filename" type="text" name="filename" style="width:100%;" placeholder="name of file">\
</div><div class="form-group">\
<label><input type="checkbox" name="minified"> Minified?</label></div>', false, function (result) {
                if (result !== false) {
                    var contents = result.minified === 'on' ? JSON.stringify(persistentVal) : persistentValStr;
                    window.download(contents, result.filename + '.json', 'application/json');
                }
            });
    });

    $('#nav-file-open-online').on('click', function () {
        window.formInputModal('Open file online',
            '<label for="_t_savefile-fileurl">File url:</label>\
<div class="form-group">\
<input required id="_t_savefile-fileurl" type="text" style="width:100%;" name="url" placeholder="url of file">\
</div>\
<b>advanced:</b>\
<div class="form-group">\
<label for="sel-method">Method: (use post if you know what you\'re doing)</label>\
<select class="form-control" id="sel-method" name="method">\
<option selected>GET</option>\
<option>POST</option>\
</select>\
</div>',
            false, function (result) {
                if (result !== false) {
                    if (window.isDataURL(result.url)) {
                        window.modalAlert('<span class="text-danger">This is not a safe url</span>', 'Data url\'s are not allowed.');
                        return;
                    }
                    $('#loader').show();
                    $.ajax({
                        type: result.method,
                        url: result.url,
                        dataType: 'json',
                        success: function (data) {
                            var str = JSON.stringify(data, null, indentUnit);
                            if (str.length > 30000) {
                                window.modalAlert('<span class="text-danger">Error</span>',
                                    'This file is too large.<br><small class="text-muted">max 30000 chars</small> / ' + str.length);
                                return;
                            }
                            persistentValStr = str;
                            persistentVal = data;
                            initialVal = window.jsondiffpatch.clone(data);
                            myCodeMirror.setValue(persistentValStr);
                            jsonTree.setNode([], persistentVal);
                            patchesHistory = [];
                            undoHistory = [];
                            $('#loader').hide();
                        },
                        error: function (jqXHR, textStatus) {
                            $('#loader').hide();
                            if (textStatus === 'http://localhost:8080/modals.js')
                                window.modalAlert('<span class="text-danger">Error</span>', 'Invalid json. This is not a json file or the json is malformed.');
                            else
                                window.modalAlert('<span class="text-danger">Error</span>', 'Could not open online json file.');
                        }
                    });
                }
            });
    });

    $('#nav-file-open-disk').on('click', function () {
        window.openReadFile(function (result, file) {
            if (result && file) {
                try {
                    var data = JSON.parse(result);
                } catch (error) {
                    window.modalAlert('<span class="text-danger">Error</span>', 'Invalid json. This is not a json file or the json is malformed.');
                    return;
                }
                if (result.length > 30000) {
                    window.modalAlert('<span class="text-danger">Error</span>',
                        'This file is too large.<br><small class="text-muted">max 30000 chars</small> / ' + result.length);
                    return;
                }
                persistentVal = data;
                initialVal = window.jsondiffpatch.clone(data);
                persistentValStr = JSON.stringify(data, null, indentUnit);
                myCodeMirror.setValue(persistentValStr);
                jsonTree.setNode([], persistentVal);
                patchesHistory = [];
                undoHistory = [];
                if (file && file.type && file.type !== 'application/json')
                    window.modalAlert('<span class="text-warning">Warning</span>', 'This file is not of type json (just to let you know).');
            } else {
                window.modalAlert('<span class="text-danger">Error</span>', 'Could not open file.');
            }

        });
    });

    $('#nav-file-new').on('click', function () {
        window.confirmModal('Are you sure?', 'You will lose all of your progress.', 'Ok', 'Cancel', function (result) {
            if (result) {
                persistentVal = {};
                initialVal = window.jsondiffpatch.clone(persistentVal);
                persistentValStr = '{}';
                myCodeMirror.setValue(persistentValStr);
                jsonTree.setNode([], persistentVal);
                patchesHistory = [];
                undoHistory = [];
            }
        });

    });

    new window.ClipboardJS('#json-editor-copy', {
        text: function () {
            return persistentValStr;
        }
    }).on('success', function () {
        displayMessage('clipboard', '<span><b>Succesfully</b> copied to clipboard</span>', 'success');
    });

    new window.ClipboardJS('#json-patch-copy', {
        text: function () {
            return $('#json-patch-output').text();
        }
    }).on('success', function () {
        displayMessage('clipboard', '<span><b>Succesfully</b> copied to clipboard</span>', 'success');
    });

    $('#json-patch-close').on('click', function () {
        $jsonPatchContainer.hide();
    });

    $('#json-patch-save-disk').on('click', function () {
        var c = $('#json-patch-output').closest('pre').attr('class') || '';
        var type = c.replace('language-', '').trim();
        var txt = $('#json-patch-output').text();
        window.formInputModal('Save schema on disk',
            '<label for="_t_savefile-filename">Filename:</label>\
<div class="form-group">\
<input required id="_t_savefile-filename" type="text" name="filename" style="width:100%;" placeholder="name of file">\
</div><div class="form-group">'
            + (type === 'json' ? '<label><input type="checkbox" name="minified"> Minified?</label>' : '')
            + '</div>', false, function (result) {
                if (result !== false) {
                    if (type === 'json' && result.minified === 'on') { // minify
                        try { txt = JSON.stringify(JSON.parse(txt)); } catch (err) {
                            window.modalAlert('<span class="text-danger">Error</span>', 'Unable to parse json');
                            return;
                        }
                    }
                    window.download(txt, result.filename + '.' + type, 'application/json');
                }
            });
    });

    $('#nav-file-convert-xml').on('click', function () {
        window.formInputModal('Convert', '<div class="form-group">\
        <label for="nav-file-convert-xml-root-name">Root name:</label>\
        <input type="text" id="nav-file-convert-xml-root-name" name="root-name" value="root"></div>\
        <div class="form-group">\
        <label><input type="checkbox" name="declaration" checked> Generate declaration</label></div>\
        <div class="form-group">\
        <label><input type="checkbox" name="doctype"> Generate doctype</label></div>\
        <div class="form-group">\
        <label><input type="checkbox" name="minified"> Minified</label></div>\
        <div class="form-group">\
        <label><input type="checkbox" name="attributes" checked> Use attributes</label></div>\
        </div>', false, function (result) {
                if (result) {
                    try {
                        var res = window.obj2xml(persistentVal, {
                            indentation: result.minified === 'on' ? null : indentUnit,
                            doctype: result.doctype === 'on' ? 'auto' : false,
                            declaration: result.declaration === 'on' ? 'auto' : false,
                            attributes: result.attributes === 'on',
                            rootName: result['root-name'],
                        });
                    } catch (err) {
                        window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to convert to xml.');
                    }
                    $patchOutput.text(res);
                    $patchOutput.attr('class', 'language-xml');
                    window.Prism.highlightAll();

                    $jsonPatchContainer.css('display', 'block');
                    setTimeout(function () {
                        $('html, body').animate({ scrollTop: $jsonPatchContainer.offset().top - 64 }, '100');
                    }, 0);
                }
            });
    });

    $('#nav-file-convert-yaml').on('click', function () {
        try {
            var res = window.YAML.stringify(persistentVal, 3, indentUnit);
        } catch (err) {
            window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to convert to yaml.');
        }
        $patchOutput.text(res);
        $patchOutput.attr('class', 'language-yaml');
        window.Prism.highlightAll();

        $jsonPatchContainer.css('display', 'block');
        setTimeout(function () {
            $('html, body').animate({ scrollTop: $jsonPatchContainer.offset().top - 64 }, '100');
        }, 0);
    });

    $('#nav-file-convert-csv').on('click', function () {
        window.formInputModal('Convert', '<div class="form-group">\
        <label for="nav-file-convert-csv-delimeter">Delimeter:</label>\
        <input required type="text" id="nav-file-convert-csv-delimeter" maxlength="1" name="delimeter" value="," style="width:20px"></div>\
        <label required for="nav-file-convert-xml-root-name">Scope character:</label>\
        <input type="text" id="nav-file-convert-xml-scope-char" maxlength="1" name="scope-char" value="/" style="width:20px"></div>\
        </div>', false, function (result) {
                if (result) {
                    try {
                        var res = window.obj2csv(persistentVal, {
                            delimeter: result.delimeter,
                            scopeChar: result['scope-char'],
                        });
                    } catch (err) {
                        window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to convert to csv.');
                    }
                    $patchOutput.text(res);
                    $patchOutput.attr('class', 'language-csv');
                    window.Prism.highlightAll();

                    $jsonPatchContainer.css('display', 'block');
                    setTimeout(function () {
                        $('html, body').animate({ scrollTop: $jsonPatchContainer.offset().top - 64 }, '100');
                    }, 0);
                }
            });
    });


    $('#nav-file-import-yaml').on('click', function () {
        window.formInputModal('Convert', '<div class="form-group">\
    <label for="nav-file-import-yaml-code">YAML code:</label>\
    <textarea required class="form-control" name="code" rows="5" id="nav-file-import-yaml-code"></textarea>\
</div>', false, function (result) {
                if (result) {
                    try {
                        var data = window.YAML.parse(result.code);
                        persistentVal = data;
                        initialVal = window.jsondiffpatch.clone(data);
                        persistentValStr = JSON.stringify(data, null, indentUnit);
                        myCodeMirror.setValue(persistentValStr);
                        jsonTree.setNode([], persistentVal);
                        patchesHistory = [];
                        undoHistory = [];
                    } catch (err) {
                        window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to parse YAML.');
                    }
                }
            });
    });

    $('#nav-file-import-xml').on('click', function () {
        window.formInputModal('Convert', '<div class="form-group">\
    <label for="nav-file-import-xml-code">XML code:</label>\
    <textarea required class="form-control" rows="5" name="code" id="nav-file-import-xml-code"></textarea></div>\
<div class="form-group"><label for="nav-file-import-xml-prefix">Attribute prefix:</label>\
    <input class="form-control" type="text" name="prefix" id="nav-file-import-xml-prefix">\
</div>', false, function (result) {
                if (result) {
                    try {
                        var prefix = result.prefix || '';
                        var data = window.xml2obj(result.code, { attrPrefix: prefix });
                        persistentVal = data;
                        initialVal = window.jsondiffpatch.clone(data);
                        persistentValStr = JSON.stringify(data, null, indentUnit);
                        myCodeMirror.setValue(persistentValStr);
                        jsonTree.setNode([], persistentVal);
                        patchesHistory = [];
                        undoHistory = [];
                    } catch (err) {
                        window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to parse XML.');
                    }
                }
            });
    });

    $('#nav-file-import-csv').on('click', function () {
        window.formInputModal('Convert', '<div class="form-group">\
    <label for="code">CSV code:</label>\
    <textarea class="form-control" rows="5" id="code"></textarea>\
</div>', false, function (result) {
                if (result) {
                    try {
                        var data = window.csv2obj(result.code);
                        persistentVal = data;
                        initialVal = window.jsondiffpatch.clone(data);
                        persistentValStr = JSON.stringify(data, null, indentUnit);
                        myCodeMirror.setValue(persistentValStr);
                        jsonTree.setNode([], persistentVal);
                        patchesHistory = [];
                        undoHistory = [];
                    } catch (err) {
                        window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to parse CSV.');
                    }
                }
            });
    });

    $('#json-patch-save-online').on('click', function () {
        var c = $('#json-patch-output').closest('pre').attr('class') || '';
        var type = c.replace('language-', '').trim();
        var val;
        switch (type) {
            case 'json':
                val = $('#json-patch-output').text();
                break;
            default:
                val = JSON.stringify({ text: $('#json-patch-output').text() }); // store string as json
                break;
        }
        $.ajax({
            url: 'https://api.myjson.com/bins',
            type: 'POST',
            data: val,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                window.modalAlert('<span class="text-success">Success!</span>',
                    'Schema file saved was saved <a href="' + data.uri + '" target="_blank">here</a>.');
            },
            error: function () {
                window.modalAlert('<span class="text-danger">Error!</span>', 'Unable to save file online.');
            }
        });
    });

    function writeSchema(type, code) {
        if (typeof (code) !== 'string') code = JSON.stringify(code, null, indentUnit);
        var lang = 'mysql-clickhouse'.indexOf(type) !== -1 ? 'sql' : 'json';
        if (lang === 'sql') code = code.replace(/(;)\s*/gm, '$1\n');
        $patchOutput.attr('class', 'language-' + lang);
        $patchOutput.text(code);
        window.Prism.highlightAll();
        $jsonPatchContainer.css('display', 'block');
        setTimeout(function () {
            $('html, body').animate({ scrollTop: $jsonPatchContainer.offset().top - 64 }, '100');
        }, 0);
    }

    parseWholeDocument();
    myCodeMirror.on('change', function (codeMirror, changeObj) {
        if (changeObj.origin === 'setValue') return;
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(parseWholeDocument, 500);
    });
    window.getPersistentValue = function getPersistentValue() {
        return persistentVal;
    };
    window.getPersistentValueStr = function getPersistentValueStr() {
        return persistentValStr;
    };

    function parseWholeDocument() {
        var json = myCodeMirror.getValue();
        try { var newval = JSON.parse(json); } catch (err) {
            displayMessage('json-parse-err', 'Unable to parse json', 'danger');
            return;
        }
        var confirmTxt = 'This is a large change. The patch recording file might become very big. \
Also the browser may become slower or stop working. If you continue you might encounter these risks. \
If you choose to cancel, the patch recording will be stopped and the editor will be refreshed (no revert).';

        var delta = window.jsondiffpatch.diff(persistentVal, newval);
        if (delta !== undefined) {
            if (isDiffIsExtreme(delta, json, persistentValStr) && confirm(confirmTxt) === false) {
                patchesHistory = [];
                undoHistory = [];
                jsonTree.setNode([], newval);
            } else {
                undoHistory = [];
                patchesHistory.push(delta);
                jsonTree.applyDelta(delta, []);
            }
            if (json.length > 30000)
                displayMessage('file-large', 'This file is very large. \
                    The browser may become slower <small class="text-muted">max 30000 chars</small> / ' + json.length, 'warning');
            persistentVal = newval;
            persistentValStr = json;

            recordDelta(delta);
        }
    }

    function strcap(str, max) {
        if (str.length > max) {
            return str.slice(0, max - 3) + '...';
        } else return str;
    }

    function nv(val) {
        if (typeof (val) === 'object' && Array.isArray(val)) {
            return 'items';
        } else if (typeof (val) === 'object') {
            return 'object';
        } else if (typeof (val) === 'string') {
            return '"' + strcap(val, 10) + '"';
        } else
            return val;
    }

    function recordDelta(delta) {
        var msg;
        var t, path, isArr, deltasQueue = [{ delta: delta, path: [], isArr: false }];
        localStorage.setItem('persistentVal', persistentValStr);
        while (deltasQueue.length > 0) {
            t = deltasQueue.pop();
            delta = t.delta;
            path = t.path;
            isArr = t.isArr;

            if (Array.isArray(delta)) {
                if (delta[2] === 0 && isArr) {
                    msg = '<span class="d">deleted</span> item <span class="po">' + nv(delta[0])
                        + '</span> from <span class="pn">' + (path.length >= 2 ? delta[path.length - 2] : 'root') + '</span>';
                } else if (delta[2] === 0) {
                    msg = '<span class="d">deleted</span> <span class="po">' + path[path.length - 1]
                        + '</span> from <span class="pn">' + (path.length >= 2 ? delta[path.length - 2] : 'root') + '</span>';
                } else if (delta[2] === 3) {
                    msg = '<span var="d">moved</span> item <span class="vn">' + nv(delta[0])
                        + '</span> from <span class="po">' + (path.length >= 1 ? delta[path.length - 1] : 'root')
                        + '</span> to <span class="pn">' + delta[1] + '</span>';
                } else if (delta.length == 2) {
                    msg = '<span var="u">modified</span> <span class="po">' + (path.length >= 1 ? path[path.length - 1] : 'root') + '</span> from <span class="vo">'
                        + nv(delta[0]) + '</span> to <span class="vn">' + nv(delta[1]) + '</span>';
                } else if (delta.length == 1) {
                    msg = '<span var="c">created</span> <span class="po">' + (path.length >= 1 ? path[path.length - 1] : 'root')
                        + '</span> with value <span class="vn">' + nv(delta[0]) + '</span>';
                }
                displayMessage(typeof (delta[0]), msg, 'info');
            } else {
                for (var key in delta) {
                    if (delta.hasOwnProperty(key) && (key !== '_t' || delta['_t'] !== 'a')) {
                        deltasQueue.push({ delta: delta[key], path: path.concat(key), isArr: delta._t === 'a' });
                    }
                }
            }
        }
    }

    function displayMessage(type, msg, alertType) {
        (function () {
            var $msg = $('<div class="alert alert-' + alertType + ' msg msg-' + type + '">' + msg + '</div>').appendTo($msgDelta);
            setTimeout(function () { $msg.addClass('in'); }, 150);
            setTimeout(function () { $msg.addClass('done'); }, 5000);
            setTimeout(function () { $msg.addClass('done'); }, 5000);
            setTimeout(function () { $msg.remove(); }, 6000);
        })();
    }

    function logPatches(merge) {
        var json;
        if (merge) {
            json = JSON.stringify(window.jsondiffpatch.formatters.jsonpatch.format(
                window.jsondiffpatch.diff(initialVal, persistentVal)), null, indentUnit);
        } else {
            json = JSON.stringify([].concat.apply([], patchesHistory.map(function (delta) {
                return window.jsondiffpatch.formatters.jsonpatch.format(delta);
            })), null, indentUnit);
        }
        $patchOutput.text(json);
        $patchOutput.attr('class', 'language-json');
        window.Prism.highlightAll();
    }

    function isDiffIsExtreme(diff, jsonTxtNew, jsonTxtOld) {
        if (Array.isArray(diff)) return true;
        if (Math.abs(jsonTxtNew.length - jsonTxtOld.length) > 3000) return true;
        return false;
    }

    jsonTree.on('change', function (delta) {
        undoHistory = [];
        patchesHistory.push(delta);
        var newval = window.jsondiffpatch.patch(persistentVal, delta);
        var newvalStr = JSON.stringify(newval, null, indentUnit);
        myCodeMirror.setValue(newvalStr);
        persistentVal = newval;
        persistentValStr = newvalStr;
        if (newvalStr.length > 30000)
            displayMessage('file-large', 'This file is very large. \
                The browser may become slower<br><small class="text-muted">max 30000 chars</small> / ' + newvalStr.length, 'warning');


        recordDelta(delta);
    });


    $('#tree > .node.root > ul').sortable({
        containerSelector: 'ul, ol',
        itemSelector: 'li',
        handle: '.move',
        opacity: .6,
        placeholderClass: 'placeholder',
        // afterMove: function ($placeholder, container, $closestItemOrContainer) {

        // },
        onDrop: function ($item, container, _super/*, event*/) {
            _super($item, container);
            var camefrom = JSON.parse($item.attr('camefrom'));
            var to = window.findPath($item[0]);
            var parent = window.getTreeNode(persistentVal, camefrom.slice(0, -1));
            if (Array.isArray(parent) === false && to.length === camefrom.length
                && to.every(function (item, i) { return item === to[i]; })) {
                return false;
            }
            jsonTree.htmlElemMoved($item, camefrom, to, persistentVal);
            $item.attr('camefrom', null);
        },
        onDragStart: function ($item, container, _super/*, event*/) {
            _super($item, container);
            $item.attr('camefrom', JSON.stringify(window.findPath($item[0]) || []));
        },
        isValidTarget: function ($item, container) {
            var type = container.el.closest('.node').attr('type');
            return type !== 'object' || $item.parent('ul')[0] !== container.el[0];
        }
    });
})();




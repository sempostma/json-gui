(function () {
    var endScopeObj = {};
    window.obj2xml = function (obj, opt) {
        if (!opt) opt = {};
        var rootName = opt.rootName || 'root';
        var declaration = opt.declaration === 'auto' ? '<?xml version="1.0" encoding="utf-8"?>' : opt.declaration;
        var indentation = opt.indentation || 0;
        var generateDtd = (opt.doctype === 'auto' || opt.doctype === 'generate') && declaration;
        var useAttributes = opt.attributes === false ? false : true;
        var scope_indent = 0;
        if (generateDtd) {
            var dtdAttr = {};
            var dtdElem = {};
        }
        var ret = [];
        var tagContent, isArr, curs, _t, _ti, key, innerKey, name, queue = [obj, rootName];
        while (queue.length > 0) {
            name = queue.pop();
            curs = queue.pop();
            if (generateDtd)
                dtdElem[name] = dtdElem[name] || {};
            if (curs === endScopeObj) {
                scope_indent--;
                if (indentation > 0) ret.push('\n', ' '.repeat(indentation * scope_indent));
                ret.push('</', name, '>');
                continue;
            }
            if (typeof curs === 'object') {
                queue.push(endScopeObj);
                queue.push(name);
                tagContent = [name];
                isArr = Array.isArray(curs);
                if (isArr && generateDtd) {
                    dtdElem[name][name + 'Item*'] = true;
                }
                for (key in curs) {
                    if (curs.hasOwnProperty(key)) {
                        if (isArr) {
                            queue.push(curs[key]);
                            queue.push(name + 'Item');
                        } else if (typeof curs[key] == 'object' || useAttributes === false) {
                            queue.push(curs[key]);
                            queue.push(key);
                            if (generateDtd)
                                dtdElem[name][key] = true;
                        } else {
                            if (generateDtd) {
                                dtdAttr[name] = dtdAttr[name] || {};
                                dtdAttr[name][key] = true;
                            }
                            tagContent.push(key + '=' + '"' + curs[key] + '"');
                        }
                    }
                }
                if (indentation > 0) ret.push('\n', ' '.repeat(indentation * scope_indent));
                ret.push('<', tagContent.join(' '), '>');
                scope_indent++;
            } else {
                if (generateDtd)
                    dtdElem[name]['#PCDATA'] = true;
                if (indentation > 0) ret.push('\n', ' '.repeat(indentation * scope_indent));
                ret.push('<');
                ret.push(name);
                ret.push('>');
                ret.push(curs);
                ret.push('</');
                ret.push(name);
                ret.push('>');
            }
        }
        if (generateDtd) {
            var dtd = ['<!DOCTYPE ', rootName, ' ['];
            for (key in dtdAttr) {
                if (dtdAttr.hasOwnProperty(key)) {
                    for (innerKey in dtdAttr[key]) {
                        if (dtdAttr[key].hasOwnProperty(innerKey)) {
                            if (indentation > 0) dtd.push('\n');
                            dtd.push('<!ATTLIST ', key, ' ', innerKey, ' CDATA #IMPLIED>');
                        }
                    }
                }
            }
            for (key in dtdElem) {
                if (dtdElem.hasOwnProperty(key)) {
                    innerKey = null;
                    _t = ['<!ELEMENT ', key, ' ('];
                    _ti = [];
                    for (innerKey in dtdElem[key]) {
                        if (dtdElem[key].hasOwnProperty(innerKey)) {
                            _ti.push(innerKey);
                        }
                    }
                    if (indentation > 0) dtd.push('\n');
                    if (innerKey === null) // no children
                        dtd.push('<!ELEMENT ', key, ' EMPTY>');
                    else {
                        _t.push(_ti.join(', '));
                        _t.push(')>');
                        dtd.push.apply(dtd, _t);
                    }
                }
            }
            dtd.push(']>');
            ret.unshift.apply(ret, dtd);
        } else if (declaration)
            ret.unshift(opt.doctype ? opt.doctype : '<!DOCTYPE ' + rootName + '>');
        if (declaration) ret.unshift(declaration);
        return ret.join('');
    };


    window.xml2obj = function xml2obj(xml, opt) {
        if (typeof xml === 'string') {
            var dom = (new DOMParser).parseFromString(xml, 'application/xml');
            xml = dom.childNodes[dom.childNodes.length - 1];
        }
        opt = opt || {};
        var attrPrefix = opt.attrPrefix || '';
        function toObj(xml) {
            var n, o = {};
            if (xml.nodeType == 1) {
                if (xml.attributes.length) {
                    for (var i = 0; i < xml.attributes.length; i++) {
                        o[attrPrefix + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || '').toString();
                    }
                }
                if (xml.firstChild) {
                    var textChild = 0, cdataChild = 0, hasElementChild = false;
                    for (n = xml.firstChild; n; n = n.nextSibling) {
                        if (n.nodeType == 1) {
                            hasElementChild = true;
                        } else {
                            if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                                textChild++;
                            } else {
                                if (n.nodeType == 4) {
                                    cdataChild++;
                                }
                            }
                        }
                    }
                    if (hasElementChild) {
                        if (textChild < 2 && cdataChild < 2) {
                            removeWhite(xml);
                            for (n = xml.firstChild; n; n = n.nextSibling) {
                                if (n.nodeType == 3) {
                                    o['#text'] = escape(n.nodeValue);
                                } else {
                                    if (n.nodeType == 4) {
                                        o['#cdata'] = escape(n.nodeValue);
                                    } else {
                                        if (o[n.nodeName]) {
                                            if (o[n.nodeName] instanceof Array) {
                                                o[n.nodeName][o[n.nodeName].length] = toObj(n);
                                            } else {
                                                o[n.nodeName] = [o[n.nodeName], toObj(n)];
                                            }
                                        } else {
                                            o[n.nodeName] = toObj(n);
                                        }
                                    }
                                }
                            }
                        } else {
                            if (!xml.attributes.length) {
                                o = escape(innerXml(xml));
                            } else {
                                o['#text'] = escape(innerXml(xml));
                            }
                        }
                    } else {
                        if (textChild) {
                            if (!xml.attributes.length) {
                                o = escape(innerXml(xml));
                            } else {
                                o['#text'] = escape(innerXml(xml));
                            }
                        } else {
                            if (cdataChild) {
                                if (cdataChild > 1) {
                                    o = escape(innerXml(xml));
                                } else {
                                    for (n = xml.firstChild; n; n = n.nextSibling) {
                                        o['#cdata'] = escape(n.nodeValue);
                                    }
                                }
                            }
                        }
                    }
                }
                if (!xml.attributes.length && !xml.firstChild) {
                    o = null;
                }
            } else {
                if (xml.nodeType == 9) {
                    o = toObj(xml.documentElement);
                } else {
                    alert('unhandled node type: ' + xml.nodeType);
                }
            }
            return o;
        }
        function innerXml(node) {
            var s = '';
            if ('innerHTML' in node) {
                s = node.innerHTML;
            } else {
                var asXml = function (n) {
                    var s = '';
                    if (n.nodeType == 1) {
                        s += '<' + n.nodeName;
                        for (var i = 0; i < n.attributes.length; i++) {
                            s += ' ' + n.attributes[i].nodeName + '="' + (n.attributes[i].nodeValue || '').toString() + '"';
                        }
                        if (n.firstChild) {
                            s += '>';
                            for (var c = n.firstChild; c; c = c.nextSibling) {
                                s += asXml(c);
                            }
                            s += '</' + n.nodeName + '>';
                        } else {
                            s += '/>';
                        }
                    } else {
                        if (n.nodeType == 3) {
                            s += n.nodeValue;
                        } else {
                            if (n.nodeType == 4) {
                                s += '<![CDATA[' + n.nodeValue + ']]\x3e';
                            }
                        }
                    }
                    return s;
                };
                for (var c = node.firstChild; c; c = c.nextSibling) {
                    s += asXml(c);
                }
            }
            return s;
        }
        function escape(txt) {
            return txt.replace(/[\\]/g, '\\\\').replace(/["]/g, '\\"').replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r');
        }
        function removeWhite(e) {
            e.normalize();
            for (var n = e.firstChild; n;) {
                if (n.nodeType == 3) {
                    if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
                        var nxt = n.nextSibling;
                        e.removeChild(n);
                        n = nxt;
                    } else {
                        n = n.nextSibling;
                    }
                } else {
                    if (n.nodeType == 1) {
                        removeWhite(n);
                        n = n.nextSibling;
                    } else {
                        n = n.nextSibling;
                    }
                }
            }
            return e;
        }
        if (xml.nodeType == 9) {
            xml = xml.documentElement;
        }
        var obj = toObj(removeWhite(xml));
        return obj;
    };
})();
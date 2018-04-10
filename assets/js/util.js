(function () {
    window.getParameterByName = function getParameterByName(name) {
        name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
        var regexS = '[\\?&]' + name + '=([^&#]*)';
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return '';
        else
            return decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    window.convert = function convert(val, type) {
        switch (type) {
            case 'string':
                return '' + val;
            case 'number':
                if (isNaN(parseFloat(val))) throw Error('Can not convert ' + val + ' to number');
                if (parseFloat(val) % 1 === 0) return parseInt(val);
                else return parseFloat(val);
            case 'null':
                return null;
            case 'undefined':
                return undefined;
            case 'boolean':
                if (window.parseBool(val) !== undefined) return window.parseBool(val);
                else throw Error('Can not convert ' + val + ' to boolean');
            default:
                throw Error('type ' + type + ' does not exist' + (type === 'bool' ? ' did you mean boolean.' : '.'));
        }
    };

    window.parseBool = function parseBool(value) {
        return (value || '').toLowerCase() === 'true'
            ? true
            : (value || '').toLowerCase() === 'false'
                ? false
                : undefined;
    };

    window.encodeIntoQuery = function encodeIntoQuery(data, discardEmptyOrNull) {
        var ret = [];
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                if (discardEmptyOrNull && !data[key] && typeof data[key] !== 'number')
                    continue;
                ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
        }
        return ret ? '?' + ret.join('&') : '';
    };

    window.camelCaseNotation = function camelCaseToSentence(camelCaseNotation) {
        var t = camelCaseNotation.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
        return t.charAt(0).toUpperCase() + t.slice(1);
    };

    window.decodeQuery = function decodeQuery(url, discardEmpty) {
        url = (url || window.location.href).split('?')[1].split('#')[0];
        var ret = {}, qKVP, qParts = url.split('&');
        for (var i = 0; i < qParts.length; i++) {
            qKVP = qParts[i].split('=');
            if (discardEmpty && (!qKVP[0] || !qKVP[1])) continue;
            ret[decodeURIComponent(qKVP[0])] = decodeURIComponent(qKVP[1]);
        }
        return ret;
    };

    window.urlEncode = function urlEncode(data) {
        var ret = [];
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
        }
        return ret;
    };

    window.extendedEncodeURIComponent = function extendedEncodeURIComponent(str) {
        return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, '%2A');
    };

    window.autosize = function autosize() {
        var el = this;
        setTimeout(function () {
            el.style.cssText = 'height:auto; padding:0';
            // for box-sizing other than "content-box" use:
            // el.style.cssText = '-moz-box-sizing:content-box';
            el.style.cssText = 'height:' + el.scrollHeight + 'px';
        }, 0);
    };


    window.isDataURL = function isDataURL(s) {
        return !!s.match(isDataURL.regex);
    };
    // eslint-disable-next-line no-useless-escape
    window.isDataURL.regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;

    var fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.style = 'position:absolute;top:-100px;';
    fileInput.id = 'file-input-that-should-only-be-used-in-this-read-file-script';
    window.openReadFile = function openReadFile(cb) {
        function readFile(evt) {
            var files = evt.target.files;
            var file = files[0];
            var reader = new FileReader();
            reader.onload = function (event) {
                fileInput.removeEventListener('change', readFile);
                cb(event.target.result, file);
            };
            reader.readAsText(file);
        }
        fileInput.addEventListener('change', readFile, false);
        setTimeout(function() {
            fileInput.click();
        });
    };
})();



(function() {
    window.obj2csv = function obj2csv(obj, opt) {
        if (typeof obj !== 'object') return null;
        opt = opt || {};
        var scopechar = opt.scopechar || '/';
        var delimeter = opt.delimeter || ',';
        if (Array.isArray(obj) === false) obj = [obj];
        var curs, name, rownum, key, queue, values = [], rows = [], headers = {}, headersArr = [];
        for(rownum = 0; rownum < obj.length; rownum++) {
            queue = [obj[rownum], ''];
            rows[rownum] = {};
            while(queue.length > 0) {
                name = queue.pop();
                curs = queue.pop();
                if (typeof curs === 'object') {
                    for (key in curs) {
                        if (curs.hasOwnProperty(key)) {
                            queue.push(curs[key]);
                            queue.push(name + (name ? scopechar : '') + key);
                        }
                    }
                } else {
                    if (headers[name] === undefined) headers[name] = true;
                    rows[rownum][name] = curs;
                }
            }
            values[rownum] = [];
        }
        // create csv text
        for (key in headers) {
            if (headers.hasOwnProperty(key)) {
                headersArr.push(key);
                for(rownum = 0; rownum < obj.length; rownum++) {
                    values[rownum].push(rows[rownum][key] === undefined || rows[rownum][key] === null
                        ? '' 
                        : JSON.stringify(rows[rownum][key]));
                }
            }
        }
        for(rownum = 0; rownum < obj.length; rownum++) {
            values[rownum] = values[rownum].join(delimeter);
        }
        return '"' + headersArr.join('"' + delimeter + '"') + '"\n' + values.join('\n');
    };

    window.csv2obj = function(csv) {
        var row, rownum, collumNum, lines = csv.split('\n');
        var headers = JSON.parse('[' + lines[0] + ']');
        var ret = [];
        for(rownum = 1; rownum < lines.length; rownum++) {
            row = JSON.parse('[' + lines[rownum].replace(/,\s*,/, ',null,') + ']');
            ret[rownum - 1] = {};
            for(collumNum = 0; collumNum < headers.length; collumNum++) {
                ret[rownum - 1][headers[collumNum]] = row[collumNum];
            }
        }
        return ret;
    };
})();
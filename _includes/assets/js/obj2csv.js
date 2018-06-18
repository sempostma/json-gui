

function obj2csv(obj, opt) {
    if (typeof obj !== 'object') return null;
    opt = opt || {};
    var scopechar = opt.scopechar || '/';
    var delimeter = opt.delimeter || ',';
    if (Array.isArray(obj) === false) obj = [obj];
    var curs, name, rownum, key, queue, values = [], rows = [], headers = {}, headersArr = [];
    for (rownum = 0; rownum < obj.length; rownum++) {
        queue = [obj[rownum], ''];
        rows[rownum] = {};
        while (queue.length > 0) {
            name = queue.pop();
            curs = queue.pop();
            if (curs !== null && typeof curs === 'object') {
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
            for (rownum = 0; rownum < obj.length; rownum++) {
                values[rownum].push(rows[rownum][key] === undefined
                    ? ''
                    : JSON.stringify(rows[rownum][key]));
            }
        }
    }
    for (rownum = 0; rownum < obj.length; rownum++) {
        values[rownum] = values[rownum].join(delimeter);
    }
    return '"' + headersArr.join('"' + delimeter + '"') + '"\n' + values.join('\n');
}

function csv2obj(csv, opt) {
    opt = opt || {};
    var delimeter = opt.delimeter || ',';
    var i, row, rownum, collumNum, lines = csv.split(/\s*\n\s*/);
    var headers = lines[0].split(delimeter);
    for(i = 0; i < headers.length; i++) {
        headers[i] = headers[i].replace(/(^[\s"]+|[\s"]+$)/g, '');
    }
    var ret = [];
    for (rownum = 1; rownum < lines.length; rownum++) {
        row = lines[rownum].split(delimeter);
        ret[rownum - 1] = {};
        for (collumNum = 0; collumNum < headers.length; collumNum++) {
            if (row[collumNum].length > 0 && (!isNaN(row[collumNum]) || row[collumNum] === 'true' 
                || row[collumNum] === 'false' || row[collumNum] === 'null')) 
                ret[rownum - 1][headers[collumNum]] = JSON.parse(row[collumNum]);
            else 
                ret[rownum - 1][headers[collumNum]] = row[collumNum].replace(/(^\s*"*|"*\s*$)/g, '');;
        }
    }
    return ret;
}
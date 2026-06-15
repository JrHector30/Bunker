const http = require('http');

http.get('http://127.0.0.1:5000/api/tables', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            console.log(data);
        } catch (e) { console.error("Parse error", e); }
    });
}).on('error', console.error);

const http = require('http');

async function dump() {
    return new Promise((resolve) => {
        http.get('http://127.0.0.1:3000/api/tables', res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const tables = JSON.parse(data);
                const t2 = tables.find(t => t.id === 2);
                console.log(`Mesa 2 Estado: ${t2.estado}`);
                t2.comandas.forEach((c, i) => {
                    console.log(`[${i}] ID: ${c.id}, Estado: ${c.estado}, Detalles len: ${c.detalles?.length}`);
                });
                resolve();
            });
        });
    });
}
dump();

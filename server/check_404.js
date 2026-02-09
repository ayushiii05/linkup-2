
import http from 'http';

const checkUrl = (path) => {
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: path,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`[${path}] Status Code: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
        res.on('end', () => {
            console.log('\n');
        });
    });

    req.on('error', (error) => {
        console.error(`[${path}] Error: ${error.message}`);
    });

    req.end();
};

checkUrl('/');
const dummyId = '65c4d6f7e8b9a1b2c3d4e5f6';
checkUrl(`/api/user/likes/${dummyId}`);

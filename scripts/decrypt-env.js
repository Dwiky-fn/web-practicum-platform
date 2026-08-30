const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const INPUT_FILE = path.resolve(__dirname, '../config/production.env.enc');
const OUTPUT_FILE = path.resolve(__dirname, '../config/production.env');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

function askHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        process.stdout.write(question);

        const stdin = process.stdin;
        const originalRawMode = stdin.isRaw;

        if (stdin.isTTY) {
            stdin.setRawMode(true);
        }

        let input = '';

        const onData = (char) => {
            char = char.toString();

            if (char === '\r' || char === '\n') {
                if (stdin.isTTY) {
                    stdin.setRawMode(originalRawMode || false);
                }

                stdin.removeListener('data', onData);
                rl.close();

                process.stdout.write('\n');
                resolve(input);
                return;
            }

            if (char === '\u0003') {
                process.stdout.write('\n');
                process.exit(1);
            }

            if (char === '\b' || char === '\x7f') {
                input = input.slice(0, -1);
            } else {
                input += char;
            }
        };

        stdin.on('data', onData);
    });
}

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('✗ config/production.env.enc tidak ditemukan.');
        process.exit(1);
    }

    if (fs.existsSync(OUTPUT_FILE)) {
        console.error('✗ config/production.env sudah ada.');
        console.error(
            '  Hapus file tersebut terlebih dahulu jika ingin melakukan decrypt.'
        );
        process.exit(1);
    }

    /*
     * Deployment key bisa diberikan melalui:
     *
     * DEPLOYMENT_KEY=...
     *
     * atau dimasukkan secara manual melalui terminal.
     */
    const deploymentKey =
        process.env.DEPLOYMENT_KEY || await askHidden(
            'Masukkan deployment key untuk dekripsi: '
        );

    if (!deploymentKey || deploymentKey.length < 16) {
        console.error('✗ Deployment key tidak valid.');
        process.exit(1);
    }

    try {
        const content = fs.readFileSync(INPUT_FILE, 'utf8').trim();
        const lines = content.split(/\r?\n/);

        if (lines.length !== 5 || lines[0] !== 'PEPV1') {
            throw new Error('Format file terenkripsi tidak valid.');
        }

        const [
            ,
            saltBase64,
            ivBase64,
            authTagBase64,
            encryptedBase64,
        ] = lines;

        const salt = Buffer.from(saltBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');
        const encrypted = Buffer.from(encryptedBase64, 'base64');

        const key = crypto.scryptSync(
            deploymentKey,
            salt,
            KEY_LENGTH
        );

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            iv
        );

        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

        fs.writeFileSync(OUTPUT_FILE, decrypted, {
            mode: 0o600,
        });

        console.log('');
        console.log('✓ Configuration berhasil didekripsi.');
        console.log('✓ Output: config/production.env');
        console.log('✓ Deployment key tidak disimpan.');

    } catch (error) {
        console.error('');
        console.error('✗ Dekripsi gagal.');
        console.error(
            '  Deployment key mungkin salah atau file terenkripsi rusak.'
        );
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('✗ Dekripsi gagal:', error.message);
    process.exit(1);
});
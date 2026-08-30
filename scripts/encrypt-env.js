const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const INPUT_FILE = path.resolve(__dirname, '../config/production.env');
const OUTPUT_FILE = path.resolve(__dirname, '../config/production.env.enc');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

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
        console.error('✗ config/production.env tidak ditemukan.');
        process.exit(1);
    }

    if (fs.existsSync(OUTPUT_FILE)) {
        console.error('✗ config/production.env.enc sudah ada.');
        console.error('  Hapus file tersebut terlebih dahulu jika ingin membuat ulang.');
        process.exit(1);
    }

    const deploymentKey = await askHidden(
        'Masukkan deployment key untuk enkripsi: '
    );

    if (!deploymentKey || deploymentKey.length < 16) {
        console.error('✗ Deployment key terlalu pendek.');
        process.exit(1);
    }

    const plaintext = fs.readFileSync(INPUT_FILE);

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(IV_LENGTH);

    const key = crypto.scryptSync(
        deploymentKey,
        salt,
        KEY_LENGTH
    );

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    /*
     * Format file:
     *
     * Header:
     *   PEPV1
     *
     * Kemudian Base64:
     *   salt
     *   iv
     *   authTag
     *   ciphertext
     */

    const output = [
        'PEPV1',
        salt.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
    ].join('\n');

    fs.writeFileSync(OUTPUT_FILE, output, {
        encoding: 'utf8',
        mode: 0o600,
    });

    console.log('');
    console.log('✓ Configuration berhasil dienkripsi.');
    console.log('✓ Output: config/production.env.enc');
    console.log('');
    console.log('Deployment key TIDAK disimpan di file.');
    console.log('Simpan deployment key secara aman karena diperlukan saat decrypt.');
}

main().catch((error) => {
    console.error('✗ Enkripsi gagal:', error.message);
    process.exit(1);
});
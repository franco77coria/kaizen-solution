const bcrypt = require('bcryptjs');
const fs = require('fs');

bcrypt.hash('kaizen_whatsapp_2026', 10).then(hash => {
    const sql = `INSERT INTO User (id, email, name, password, role, isActive, createdAt, updatedAt) VALUES ('admin001', 'gerencia@kaizensolutionscol.com', 'Gerencia Kaizen', '${hash}', 'SUPER_ADMIN', 1, NOW(), NOW());`;
    fs.writeFileSync('user-insert.sql', sql);
    console.log('SQL written to user-insert.sql');
    console.log('Hash: ' + hash);
});

const fs = require('fs');
const path = require('path');

// Путь к файлу app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Читаем app.json
fs.readFile(appJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка чтения app.json:', err);
    process.exit(1);
  }

  try {
    const appJson = JSON.parse(data);
    const env = appJson.expo.extra || {};

    // Устанавливаем переменные окружения
    process.env.IP = env.IP || 'localhost';
    process.env.PORT = env.PORT || 80;
    process.env.DEVMODE = env.devmode ? 'true' : 'false';

    console.log('Переменные окружения установлены:');
    console.log('IP:', process.env.IP);
    console.log('PORT:', process.env.PORT);
    console.log('DEVMODE:', process.env.DEVMODE);

    // Запускаем expo start с нужными параметрами
    const { spawn } = require('child_process');
    const expo = spawn('expo', ['start', '--lan'], { stdio: 'inherit', env: process.env });

    expo.on('close', (code) => {
      console.log(`Expo start завершился с кодом ${code}`);
      process.exit(code);
    });
  } catch (err) {
    console.error('Ошибка парсинга app.json:', err);
    process.exit(1);
  }
}); 
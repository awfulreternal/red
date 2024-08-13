const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создание базы данных
const dbPath = path.join(__dirname, 'gameData.db');
const db = new sqlite3.Database(dbPath);

// Создаем таблицу, если она не существует
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    chatId INTEGER PRIMARY KEY,
    name TEXT,
    health INTEGER,
    strength INTEGER,
    agility INTEGER,
    reputation INTEGER,
    location TEXT,
    money INTEGER,
    cents INTEGER,
    weapon TEXT,
    storyPoints INTEGER
  )`);
});

const token = '7132924835:AAF8r6Q1LhQP4IuPC9MFqB84sA8-MvuWND8'; // Замените на ваш токен бота
const bot = new TelegramBot(token, { polling: true });

// Доступные локации
const availableLocations = ['Blackwater', 'Saint Denis', 'Rhodes', 'Valentine'];

// Флаг для создания персонажа
const creatingCharacter = new Set(); // Для отслеживания процесса создания персонажа

// Функция для создания персонажа
const createCharacter = (chatId, name) => {
  const character = {
    name: name,
    health: 100,
    strength: 10,
    agility: 10,
    reputation: 0,
    location: 'Blackwater',
    money: 50, // Начальный баланс долларов
    cents: 0,  // Начальный баланс центров
    weapon: 'Револьвер',
    storyPoints: 0,
  };

  db.run(`INSERT INTO players (chatId, name, health, strength, agility, reputation, location, money, cents, weapon, storyPoints)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [chatId, character.name, character.health, character.strength, character.agility, character.reputation, character.location, character.money, character.cents, character.weapon, character.storyPoints]);

  creatingCharacter.delete(chatId);
  bot.sendMessage(chatId, `✨ Вас зовут <b>${character.name}</b>! Вы начинаете свой путь в <b>${character.location}</b>! 🌍`, { parse_mode: 'HTML' });
  mainMenu(chatId);
};

// Функция для создания главного меню
const mainMenu = (chatId) => {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '👤 Новый персонаж' }, { text: '📜 Инвентарь' }],
        [{ text: '🗺️ Местоположение' }, { text: '💰 Деньги' }],
        [{ text: '🤝 Репутация' }, { text: '💾 Сохранить' }],
        [{ text: '📂 Загрузить' }, { text: '🏇 Поездка на лошади' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
  bot.sendMessage(chatId, '🎮 Добро пожаловать! Выберите действие:', options);
};

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  mainMenu(chatId);
});

// Обработка команды /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🤔 <b>Помощь</b>:\
👉 Используйте кнопки в меню, чтобы взаимодействовать с игрой.\

🌍 Ваши команды:\
/start - начать игру
/help - получить помощь
`, { parse_mode: 'HTML' });
});

// Обработка сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text;

  // Проверка на создание персонажа
  if (creatingCharacter.has(chatId)) {
    createCharacter(chatId, userInput);
    return;
  }

  switch (userInput) {
    case '👤 Новый персонаж':
      bot.sendMessage(chatId, 'Как зовут вашего персонажа?');
      creatingCharacter.add(chatId); // Устанавливаем флаг создания персонажа
      break;

    case '📜 Инвентарь':
      db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
        if (row) {
          const weapon = row.weapon || 'нет оружия';
          const money = row.money || 0;
          bot.sendMessage(chatId, `🔫 У вас есть: ${weapon}\n💵 ${money} долларов.`, { parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, 'Сначала создайте персонажа.');
        }
      });
      break;

    case '🗺️ Местоположение':
      db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
        if (row) {
          bot.sendMessage(chatId, `📍 Вы находитесь в <b>${row.location}</b>`, { parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, 'Сначала создайте персонажа.');
        }
      });
      break;

    case '💰 Деньги':
      db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
        if (row) {
          bot.sendMessage(chatId, `💵 У вас ${row.money} долларов и ${row.cents} центров.`, { parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, 'Сначала создайте персонажа.');
        }
      });
      break;

    case '🤝 Репутация':
      db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
        if (row) {
          bot.sendMessage(chatId, `🌟 Ваша репутация: <b>${row.reputation}</b>`, { parse_mode: 'HTML' });
        } else {
          bot.sendMessage(chatId, 'Сначала создайте персонажа.');
        }
      });
      break;

    case '💾 Сохранить':
      // Логика сохранения
      bot.sendMessage(chatId, '💾 Игра сохранена!');
      break;

    case '📂 Загрузить':
      // Логика загрузки
      bot.sendMessage(chatId, '📂 Игра загружена!');
      break;

    case '🏇 Поездка на лошади':
      db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
        if (row) {
          const locationOptions = {
            reply_markup: {
              keyboard: availableLocations.map(location => [{ text: location }]),
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          };
          bot.sendMessage(chatId, '🏇 Куда вы хотите поехать на лошади?', locationOptions);
        } else {
          bot.sendMessage(chatId, 'Сначала создайте персонажа.');
        }
      });
      break;

    default:
      if (availableLocations.includes(userInput)) {
        // Случайное событие во время поездки
        const randomEvent = Math.random() < 0.5; // 50% шанс на событие
        const eventMessage = randomEvent ? 
          '🎉 Вы встретили путника, который дал вам 20 долларов!' : 
          '😱 На вас напали бандиты! Вы потеряли 10 здоровья.';

        db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
          if (randomEvent) {
            // Если встретили путника
            const newMoney = row.money + 20;
            db.run(`UPDATE players SET money = ? WHERE chatId = ?`, [newMoney, chatId]);
            bot.sendMessage(chatId, eventMessage + ` У вас теперь 💵 ${newMoney} долларов.`);
          } else {
            // Если напали бандиты
            const newHealth = row.health - 10;
            db.run(`UPDATE players SET health = ? WHERE chatId = ?`, [newHealth, chatId]);
            bot.sendMessage(chatId, eventMessage + ` У вас теперь ❤️ ${newHealth} здоровья.`);
          }
          bot.sendMessage(chatId, `✅ Вы успешно доехали до <b>${userInput}</b>.`, { parse_mode: 'HTML' });
          mainMenu(chatId); // Вернуть в главное меню после поездки
        });
      } else {
        db.get(`SELECT * FROM players WHERE chatId = ?`, [chatId], (err, row) => {
          if (!row) {
            bot.sendMessage(chatId, 'Сначала создайте персонажа.');
          }
          mainMenu(chatId); // Вернуть в главное меню после действия
        });
      }
  }
});

// Запуск бота
console.log('🤖 Бот запущен!');

// Закрытие базы данных при завершении работы приложения
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

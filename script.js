const englishwords = [];
const estonianwords = [];
const frenchwords = [];
const avatarIcon = document.getElementById('avatar');
const iconMenu = document.getElementById('icon-menu');
const avatarOptions = document.querySelectorAll('.avatar_option');
let currentLogin = '';
let selectedAvatar = avatarIcon.src;

function createCards(words, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  words.forEach((word) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = word.native;
    card.setAttribute('data-foreign', word.foreign);
    let flipped = false;
    card.addEventListener('click', () => {
      flipped = !flipped;
      card.textContent = flipped ? word.foreign : word.native;
    });
    container.appendChild(card);
  });
}

function toggleAvatarMenu() {
  iconMenu.style.display = iconMenu.style.display === 'none' ? 'block' : 'none';
}

function hideIconMenu() {
  iconMenu.style.display = 'none';
}

function changeAvatar(newAvatarSrc) {
  selectedAvatar = newAvatarSrc;
  avatarIcon.src = newAvatarSrc;
}

avatarIcon.addEventListener('click', toggleAvatarMenu);
document.addEventListener('click', function (event) {
  if (!iconMenu.contains(event.target) && event.target !== avatarIcon) {
    hideIconMenu();
  }
});
avatarOptions.forEach((option) => {
  option.addEventListener('click', () => {
    const src = option.getAttribute('data-avatar');
    changeAvatar(src);
  });
});

document.querySelectorAll('.folder-title').forEach((title) => {
  title.addEventListener('click', () => {
    const cards = title.nextElementSibling;
    cards.style.display = cards.style.display === 'none' ? 'flex' : 'none';
  });
});

document.getElementById('login-btn').addEventListener('click', () => {
  const login = prompt('Enter your login:');
  if (!login) return;

  currentLogin = login;
  avatarIcon.src = selectedAvatar;

  alert(`Welcome, ${currentLogin}!`);
  loadUserData();
});

document.querySelectorAll('.add-button').forEach((button) => {
  button.addEventListener('click', () => {
    if (!currentLogin) {
      alert('Please log in to your account first!');
      return;
    }

    const targetId = button.getAttribute('data-target');
    const word = prompt('Enter the word in folder language:');
    const translation = prompt('Enter the word in your native language:');

    if (word && translation) {
      const card = { native: word, foreign: translation };
      if (targetId === 'english-cards') englishwords.push(card);
      else if (targetId === 'estonian-cards') estonianwords.push(card);
      else if (targetId === 'french-cards') frenchwords.push(card);

      createCards(getWordsArray(targetId), targetId);
      saveToDatabase();
    }
  });
});

function getWordsArray(containerId) {
  if (containerId === 'english-cards') return englishwords;
  if (containerId === 'estonian-cards') return estonianwords;
  if (containerId === 'french-cards') return frenchwords;
  return [];
}

document.querySelectorAll('.test-button').forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    startTest(targetId);
  });
});

let testWords = [];
let currentTestIndex = 0;

function startTest(containerId) {
  const cards = document.querySelectorAll(`#${containerId} .card`);
  if (cards.length === 0) {
    alert('Bro, you have no words for the test.');
    return;
  }

  testWords = Array.from(cards).map((card) => ({
    native: card.textContent,
    foreign: card.getAttribute('data-foreign'),
  }));
  currentTestIndex = 0;
  askNextWord();
}

function askNextWord() {
  if (currentTestIndex >= testWords.length) {
    alert('Test completed!');
    return;
  }

  const word = testWords[currentTestIndex];
  const askForeign = Math.random() < 0.5;
  const question = askForeign
    ? `How to translate the word "${word.native}"?`
    : `What is the word in another language "${word.foreign}"?`;

  const answer = prompt(question);
  const correctAnswer = askForeign ? word.foreign : word.native;

  if (
    answer &&
    answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  ) {
    alert('Right!');
  } else {
    alert(`Wrong! Now go learn the word: ${correctAnswer}`);
  }

  currentTestIndex++;
  askNextWord();
}

function saveToDatabase() {
  const payload = {
    login: currentLogin,
    avatar: selectedAvatar,
    words: {
      english: englishwords,
      estonian: estonianwords,
      french: frenchwords,
    },
  };

  fetch('https://kool.krister.ee/chat/wordlet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to save');
    })
    .catch((err) => {
      console.error(err);
      alert('Failed to save to database');
    });
}

function loadUserData() {
  fetch('https://kool.krister.ee/chat/wordlet')
    .then((res) => res.json())
    .then((users) => {
      const user = users.find((u) => u.login === currentLogin);
      if (!user) return;

      selectedAvatar = user.avatar || selectedAvatar;
      avatarIcon.src = selectedAvatar;

      englishwords.length = 0;
      estonianwords.length = 0;
      frenchwords.length = 0;

      if (user.words) {
        user.words.english?.forEach((w) => englishwords.push(w));
        user.words.estonian?.forEach((w) => estonianwords.push(w));
        user.words.french?.forEach((w) => frenchwords.push(w));
      }

      createCards(englishwords, 'english-cards');
      createCards(estonianwords, 'estonian-cards');
      createCards(frenchwords, 'french-cards');
    });
}

function loadHighScores() {
  fetch('https://kool.krister.ee/chat/wordlet')
    .then((res) => res.json())
    .then((users) => {
      const table = document.getElementById('highscores-table');
      table.innerHTML = '';

      const maxWordsByUser = {};

      users.forEach((u) => {
        if (!u.login || !u.words) return;
        const total =
          (u.words.english?.length || 0) +
          (u.words.estonian?.length || 0) +
          (u.words.french?.length || 0);
        if (!maxWordsByUser[u.login] || total > maxWordsByUser[u.login]) {
          maxWordsByUser[u.login] = total;
        }
      });

      const sorted = Object.entries(maxWordsByUser)
        .map(([login, count]) => ({ login, count }))
        .sort((a, b) => b.count - a.count);

      if (sorted.length === 0) {
        table.textContent = 'Nobody wrote a single word, bro.';
        return;
      }

      const ul = document.createElement('ul');
      sorted.forEach((user, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${user.login} — ${user.count} words`;
        ul.appendChild(li);
      });

      table.appendChild(ul);
    });
}

window.addEventListener('load', loadHighScores);

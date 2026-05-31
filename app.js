let MUSIC_MASTER = [];

// 1. GRADE係数判定
function getGradeCoefficient(score) {
  if (score >= 9900000) return 1.05;
  if (score >= 9800000) return 1.02;
  if (score >= 9700000) return 1.00;
  if (score >= 9500000) return 0.97;
  if (score >= 9300000) return 0.94;
  if (score >= 9000000) return 0.91;
  if (score >= 8700000) return 0.88;
  if (score >= 7500000) return 0.85;
  if (score >= 6500000) return 0.82;
  return 0.80;
}

// 2. クリアメダル係数判定
function getMedalCoefficient(medal) {
  const map = { PUC: 1.10, UC: 1.06, MAXXIVE: 1.04, EXC: 1.02, COMP: 1.00, CRASH: 0.50 };
  return map[medal] || 1.00;
}

// 3. 単曲VF計算
function calculateSingleVf(arcadeLevel, score, medal) {
  const gradeCoeff = getGradeCoefficient(score);
  const medalCoeff = getMedalCoefficient(medal);
  const rawVf = arcadeLevel * (score / 10000000) * gradeCoeff * medalCoeff * 20;
  return Math.floor(rawVf);
}

// 4. ローカルストレージ操作（スコア用）
function loadScores() {
  const data = localStorage.getItem('sdvx_scores');
  return data ? JSON.parse(data) : {};
}

function saveScore(musicId, score, medal) {
  const scores = loadScores();
  scores[musicId] = { score, medal };
  localStorage.setItem('sdvx_scores', JSON.stringify(scores));
}

// 【新規追加】指定した楽曲IDのスコアをLocalStorageから消去する関数
function deleteScore(musicId, title) {
  if (confirm(`「${title}」の登録スコアを削除しますか？`)) {
    const scores = loadScores();
    if (scores[musicId]) {
      delete scores[musicId]; // 対象データを削除
      localStorage.setItem('sdvx_scores', JSON.stringify(scores));
      updateDashboard(); // 画面表記と総合VFを即座に再計算
    }
  }
}

// 5. ローカルストレージ操作（楽曲マスタ用）
function loadStoredMaster() {
  const data = localStorage.getItem('sdvx_music_master');
  if (data) {
    MUSIC_MASTER = JSON.parse(data);
    return true;
  }
  return false;
}

// 【新規追加】英字IやVとローマ数字ⅠやⅤを同一視するための文字列正規化関数
function normalizeString(str) {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/[i１]/g, 'i')
    .replace(/[v５]/g, 'v')
    .replace(/[x０]/g, 'x')
    .replace(/Ⅰ/g, 'i')
    .replace(/Ⅱ/g, 'ii')
    .replace(/Ⅲ/g, 'iii')
    .replace(/Ⅳ/g, 'iv')
    .replace(/Ⅴ/g, 'v')
    .replace(/Ⅵ/g, 'vi')
    .replace(/Ⅶ/g, 'vii')
    .replace(/Ⅷ/g, 'viii')
    .replace(/Ⅸ/g, 'ix')
    .replace(/Ⅹ/g, 'x');
}

// 6. 楽曲セレクトボックスの表示を更新する (表記ゆれ対応・難易度絞り込み版)
function updateMusicSelectOptions() {
  const musicSelect = document.getElementById('music-select');
  const searchInput = document.getElementById('search-input');
  const levelFilterSelect = document.getElementById('level-filter-select');
  
  if (!musicSelect) return;
  musicSelect.innerHTML = '';

  if (!MUSIC_MASTER || MUSIC_MASTER.length === 0) {
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "-- 先に楽曲マスタを読み込んでください --";
    musicSelect.appendChild(option);
    return;
  }

  // 検索キーワードと難易度を取得し、検索文字はローマ数字変換などを適用して正規化
  const keyword = searchInput ? normalizeString(searchInput.value) : "";
  const targetLevelGroup = levelFilterSelect ? levelFilterSelect.value : "";

  const filteredSongs = MUSIC_MASTER.filter(music => {
    // 曲名も同じルールで正規化してからキーワードが含まれるかチェック
    const matchesKeyword = normalizeString(music.title).includes(keyword);

    let matchesLevel = true;
    if (targetLevelGroup === "18") {
      matchesLevel = music.arcadeLevel >= 18.0 && music.arcadeLevel < 19.0;
    } else if (targetLevelGroup === "19") {
      matchesLevel = music.arcadeLevel >= 19.0 && music.arcadeLevel < 20.0;
    } else if (targetLevelGroup === "20") {
      matchesLevel = music.arcadeLevel >= 20.0;
    }

    return matchesKeyword && matchesLevel;
  });

  if (filteredSongs.length === 0) {
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "-- 該当する楽曲がありません --";
    musicSelect.appendChild(option);
    return;
  }

  filteredSongs.forEach(music => {
    const option = document.createElement('option');
    option.value = music.id;
    const acLvlDisplay = music.arcadeLevel > 0 ? music.arcadeLevel.toFixed(1) : '-';
    option.textContent = `[AC Lv ${acLvlDisplay}] ${music.title}`;
    musicSelect.appendChild(option);
  });
}

// 7. ダッシュボード表示更新 (削除ボタンとの紐付け追加)
function updateDashboard() {
  const userScores = loadScores();
  const calculatedList = [];

  if (MUSIC_MASTER && MUSIC_MASTER.length > 0) {
    MUSIC_MASTER.forEach(music => {
      const record = userScores[music.id];
      if (record) {
        const vf = calculateSingleVf(music.arcadeLevel, record.score, record.medal);
        calculatedList.push({
          id: music.id, // 削除ボタンの識別に必要
          title: music.title,
          arcadeLevel: music.arcadeLevel,
          score: record.score,
          medal: record.medal,
          vf: vf
        });
      }
    });
  }

  calculatedList.sort((a, b) => b.vf - a.vf);
  const best50 = calculatedList.slice(0, 50);

  const totalVfRaw = best50.reduce((sum, item) => sum + item.vf, 0);
  const totalVfElement = document.getElementById('total-vf');
  if (totalVfElement) {
    totalVfElement.textContent = (totalVfRaw / 1000).toFixed(3);
  }

  const tbody = document.getElementById('best-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    best50.forEach((item, index) => {
      const tr = document.createElement('tr');
      const acLvlDisplay = item.arcadeLevel > 0 ? item.arcadeLevel.toFixed(1) : '-';
      
      // 各行を組み立て。最後のセルに削除用のボタンタグを追加
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.title}</td>
        <td>${acLvlDisplay}</td>
        <td>${item.score.toLocaleString()}</td>
        <td>${item.medal}</td>
        <td>${(item.vf / 1000).toFixed(3)}</td>
        <td><button class="btn-danger" data-id="${item.id}" data-title="${item.title}">削除</button></td>
      `;
      tbody.appendChild(tr);
    });

    // 表に配置された「削除」ボタン一斉にクリックイベントを紐付ける処理
    const deleteButtons = tbody.querySelectorAll('.btn-danger');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target;
        const musicId = target.getAttribute('data-id');
        const title = target.getAttribute('data-title');
        deleteScore(musicId, title);
      });
    });
  }
}

// 8. クォーテーションや改行に対応した高度なCSVパース関数
function parseCSV(text) {
  let lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    let next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// 9. 楽曲マスタCSVのインポート処理
function handleMasterCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    const parsedMaster = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const id = row[0];
      const title = row[1];
      const level = row[2];

      if (id && title && id.trim() !== "" && title.trim() !== "") {
        parsedMaster.push({
          id: id.trim(),
          title: title.trim(),
          arcadeLevel: parseFloat(level) || 0
        });
      }
    }

    if (parsedMaster.length > 0) {
      MUSIC_MASTER = parsedMaster;
      localStorage.setItem('sdvx_music_master', JSON.stringify(MUSIC_MASTER));
      
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = "";
      const levelFilterSelect = document.getElementById('level-filter-select');
      if (levelFilterSelect) levelFilterSelect.value = "";
      
      updateMusicSelectOptions();
      updateDashboard();
      
      const statusEl = document.getElementById('master-status');
      if (statusEl) {
        statusEl.textContent = `楽曲マスタを同期しました (${MUSIC_MASTER.length}曲)`;
        statusEl.style.color = "#68d391";
      }
      alert("楽曲マスタの読み込みに成功しました！");
    } else {
      alert("CSVファイルから有効な楽曲データが見つかりませんでした。ファイルの中身を確認してください。");
    }
  };
  reader.readAsText(file);
}

// 10. ユーザースコアCSVエクスポート機能
function exportToCSV() {
  const scores = loadScores();
  let csvContent = "musicId,score,medal\n";
  for (const musicId in scores) {
    csvContent += `${musicId},${scores[musicId].score},${scores[musicId].medal}\n`;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "sdvx_konaste_scores.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 11. ユーザースコアCSVインポート機能
function handleCSVImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    const newScores = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      
      const musicId = row[0];
      const score = row[1];
      const medal = row[2];

      if (musicId && score && medal) {
        newScores[musicId] = {
          score: parseInt(score, 10),
          medal: medal.trim()
        };
      }
    }

    localStorage.setItem('sdvx_scores', JSON.stringify(newScores));
    updateDashboard();
    alert("スコアデータをインポートしました！");
  };
  reader.readAsText(file);
}

// 12. アプリ起動時のイベント登録
window.addEventListener('DOMContentLoaded', () => {
  const scoreForm = document.getElementById('score-form');
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const masterInput = document.getElementById('master-input');
  const searchInput = document.getElementById('search-input');
  const levelFilterSelect = document.getElementById('level-filter-select');

  if (loadStoredMaster()) {
    const statusEl = document.getElementById('master-status');
    if (statusEl) {
      statusEl.textContent = `前回の楽曲マスタを自動読込しました (${MUSIC_MASTER.length}曲)`;
      statusEl.style.color = "#68d391";
    }
  }

  updateMusicSelectOptions();
  updateDashboard();

  if (masterInput) masterInput.addEventListener('change', handleMasterCSVImport);
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      updateMusicSelectOptions();
    });
  }
  
  if (levelFilterSelect) {
    levelFilterSelect.addEventListener('change', () => {
      updateMusicSelectOptions();
    });
  }
  
  if (scoreForm) {
    scoreForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const musicSelect = document.getElementById('music-select');
      if (!musicSelect) return;
      
      const musicId = musicSelect.value;
      if (!musicId) {
        alert("楽曲を選択してください。");
        return;
      }
      const score = parseInt(document.getElementById('score-input').value, 10);
      const medal = document.getElementById('medal-select').value;

      saveScore(musicId, score, medal);
      updateDashboard();
      scoreForm.reset();
      
      if (searchInput) searchInput.value = "";
      if (levelFilterSelect) levelFilterSelect.value = "";
      updateMusicSelectOptions();
    });
  }
  
  if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
  if (importInput) importInput.addEventListener('change', handleCSVImport);
});
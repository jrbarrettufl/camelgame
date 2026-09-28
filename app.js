(() => {
  const SIZE = 4;
  const START = { row: 3, col: 0 };
  const GOAL = { row: 0, col: 3 };
  const CACTI = new Set(['0,0', '1,1', '1,2', '2,1']);
  const DIRECTIONS = [{ row: -1, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 0, col: -1 }];
  const names = { forward: 'Move forward', left: 'Turn left', right: 'Turn right' };
  const icons = { forward: '↑', left: '↶', right: '↷' };
  let program = [];
  let camel = { ...START, direction: 0 };
  let running = false;
  let toastTimer;
  const grid = document.querySelector('#grid');
  const programEl = document.querySelector('#program');
  const runButton = document.querySelector('#runButton');
  const toast = document.querySelector('#toast');

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  function drawGrid() {
    grid.replaceChildren();
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('div');
      const key = `${row},${col}`;
      cell.className = 'cell'; cell.setAttribute('role', 'gridcell');
      if (CACTI.has(key)) { cell.classList.add('cactus'); cell.setAttribute('aria-label', 'Cactus obstacle'); cell.innerHTML = '<span class="sprite">🌵</span>'; }
      if (row === START.row && col === START.col) { cell.classList.add('start-cell'); cell.setAttribute('aria-label', 'Start: Codie the camel'); }
      if (row === GOAL.row && col === GOAL.col) { cell.classList.add('goal-cell'); cell.setAttribute('aria-label', 'School: finish'); cell.innerHTML = '<img class="school-sprite" src="camelschool.jpg" alt="School">'; }
      if (camel.row === row && camel.col === col) { cell.classList.add('active'); cell.setAttribute('aria-label', 'Codie the camel'); cell.insertAdjacentHTML('beforeend', '<img class="camel-sprite" src="codiecamel.jpg" alt="Codie the camel">'); }
      grid.append(cell);
    }
  }
  function renderProgram() {
    programEl.replaceChildren();
    document.querySelector('#blockCount').textContent = `${program.length} ${program.length === 1 ? 'BLOCK' : 'BLOCKS'}`;
    if (!program.length) { programEl.innerHTML = '<div class="empty-state"><div><span class="empty-icon">🧩</span>Your code will appear here.<br>Tap a block above to get started!</div></div>'; return; }
    program.forEach((item, index) => {
      const block = document.createElement('div'); block.className = `block ${item.type}`;
      if (item.type === 'repeat') {
        block.innerHTML = `<span class="mini-icon">⟳</span><strong>Repeat</strong><label class="repeat-count"><input aria-label="Repeat count" type="number" min="2" max="8" value="${item.count}"> times</label><button class="remove" aria-label="Remove repeat block" type="button">×</button>`;
        block.querySelector('input').addEventListener('change', event => { item.count = Math.max(2, Math.min(8, Number(event.target.value) || 2)); event.target.value = item.count; });
      } else block.innerHTML = `<span class="mini-icon">${icons[item.type]}</span><strong>${names[item.type]}</strong><button class="remove" aria-label="Remove ${names[item.type]} block" type="button">×</button>`;
      block.querySelector('.remove').addEventListener('click', () => { program.splice(index, 1); renderProgram(); });
      programEl.append(block);
    });
  }
  function resetCamel() { camel = { ...START, direction: 0 }; drawGrid(); }
  function addAction(type) { if (running) return; program.push({ type }); renderProgram(); }
  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addAction(button.dataset.add)));
  document.querySelector('#addRepeat').addEventListener('click', () => { if (!running) { program.push({ type: 'repeat', count: 3 }); renderProgram(); } });
  document.querySelector('#clearButton').addEventListener('click', () => { if (running) return; program = []; resetCamel(); renderProgram(); });
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function runProgram() {
    if (running) return;
    if (!program.length) { showToast('Add a few code blocks first!'); return; }
    running = true; runButton.disabled = true; runButton.innerHTML = '<span>•••</span> RUNNING'; resetCamel();
    let steps = 0, bumped = false;
    async function execute(items) {
      for (const item of items) {
        if (steps >= 100 || bumped || (camel.row === GOAL.row && camel.col === GOAL.col)) return;
        if (item.type === 'repeat') { for (let i = 0; i < item.count && steps < 100 && !bumped; i++) await execute(item.children || items.slice(items.indexOf(item) + 1)); continue; }
        steps++;
        if (item.type === 'left') camel.direction = (camel.direction + 3) % 4;
        else if (item.type === 'right') camel.direction = (camel.direction + 1) % 4;
        else {
          const dir = DIRECTIONS[camel.direction], next = { row: camel.row + dir.row, col: camel.col + dir.col };
          if (next.row < 0 || next.col < 0 || next.row >= SIZE || next.col >= SIZE || CACTI.has(`${next.row},${next.col}`)) {
            bumped = true; drawGrid(); const current = grid.children[camel.row * SIZE + camel.col]; current.classList.add('bump'); await pause(370); return;
          }
          camel = { ...next, direction: camel.direction };
        }
        drawGrid(); await pause(290);
        if (camel.row === GOAL.row && camel.col === GOAL.col) return;
      }
    }
    // A repeat repeats the commands that follow it as a group; those commands run only once outside a repeat.
    const repeatIndex = program.findIndex(item => item.type === 'repeat');
    if (repeatIndex < 0) await execute(program);
    else {
      const before = program.slice(0, repeatIndex), repeat = program[repeatIndex], after = program.slice(repeatIndex + 1);
      await execute(before);
      for (let i = 0; i < repeat.count && steps < 100 && !bumped && !(camel.row === GOAL.row && camel.col === GOAL.col); i++) await execute(after);
    }
    const won = camel.row === GOAL.row && camel.col === GOAL.col;
    running = false; runButton.disabled = false; runButton.innerHTML = '<span>▶</span> RUN PROGRAM';
    if (won) showToast('You did it! Codie made it to school! 🎉');
    else if (bumped) showToast('Uh-oh, that path is blocked! Try another route.');
    else showToast('Codie is still in the desert. Adjust your code and try again!');
  }
  runButton.addEventListener('click', runProgram);
  drawGrid(); renderProgram();
})();

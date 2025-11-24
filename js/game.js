// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// --- Game State ---
let gameState = {
    inventory: [],
    equipment: {
        weapon: null,
        armor: null
    },
    hp: 100,
    maxHp: 100,
    ep: 50,
    maxEp: 50,
    currentScene: 'start',
    mode: 'idle' // 'idle', 'battle', 'event'
};

// --- Story Data ---
const storyData = {
    'start': {
        text: "คุณยืนอยู่หน้าปากทางเข้าดันเจี้ยนโบราณ\nกลิ่นอับชื้นโชยออกมา...",
        bgColor: 0x2c3e50,
        choices: [
            { text: "จุดไฟแช็กและเดินเข้าไป", next: 'hallway' },
            { text: "หนีกลับบ้านดีกว่า", next: 'end_coward' }
        ]
    },
    'hallway': {
        text: "ทางเดินมืดสนิท แสงไฟส่องเห็นประตูสองบาน\nทางซ้ายดูเหมือนห้องเก็บของ ทางขวามีเสียงคำราม",
        bgColor: 0x34495e,
        surveyText: "ได้ยินเสียงหนูวิ่ง และเสียงหยดน้ำ", // Hidden flavor text found by survey
        surveyCost: 2,
        choices: [
            { text: "เข้าประตูซ้าย (ห้องเก็บของ)", next: 'storage_room' },
            { text: "เข้าประตูขวา (ห้องมอนสเตอร์)", next: 'monster_room' }
        ]
    },
    'storage_room': {
        text: "ห้องเต็มไปด้วยฝุ่น",
        bgColor: 0x7f8c8d,
        item: { id: 'old_sword', name: 'ดาบเก่าๆ', type: 'weapon', atk: 10 },
        surveyText: "ไม่มีสัญญาณสิ่งมีชีวิต แต่มีของมีค่า",
        surveyCost: 3,
        choices: [
            { text: "กลับไปทางเดิน", next: 'hallway_with_sword' }
        ]
    },
    'hallway_with_sword': {
        text: "คุณกลับมาที่ทางเดินพร้อมอาวุธ\nมั่นใจขึ้นเยอะ",
        bgColor: 0x34495e,
        surveyCost: 1,
        choices: [
            { text: "บุกเข้าประตูขวา! (ห้องมอนสเตอร์)", next: 'monster_room' }
        ]
    },
    'monster_room': {
        text: "ก๊อบลินตัวเขียวยืนขวางทางอยู่! มันดูหิวโหย",
        bgColor: 0xc0392b,
        surveyText: "อันตรายสูง! ก๊อบลินดูแข็งแรง",
        surveyCost: 5,
        choices: [
            { text: "สู้!", next: 'BATTLE_START' },
            { text: "วิ่งหนี", next: 'hallway' }
        ]
    },
    'death_fight': {
        text: "คุณพ่ายแพ้...\n(GAME OVER)",
        bgColor: 0x000000,
        choices: [
            { text: "เริ่มใหม่", next: 'start' }
        ]
    },
    'end_coward': {
        text: "คุณตัดสินใจกลับบ้านไปนอน... (BAD ENDING)",
        bgColor: 0xffffff,
        textColor: '#000000',
        choices: [
            { text: "ลองใหม่อีกครั้ง", next: 'start' }
        ]
    },
    'end_win': {
        text: "ยินดีด้วย! จบเดโม",
        bgColor: 0x2ecc71,
        choices: [
            { text: "เล่นใหม่", next: 'start' }
        ]
    }
};

// --- UI Variables ---
let mainContainer;
let storyText;
let statusText;
let choiceContainer;
let backgroundRect;

// Inventory UI
let inventoryButton;
let inventoryLayer; // The modal
let inventoryGrid;
let inventoryDesc; // To show item details

function preload() {
    // No assets
}

function create() {
    // 1. Background
    backgroundRect = this.add.rectangle(400, 300, 800, 600, 0x000000);

    // 2. Main Container
    mainContainer = this.add.container(0, 0);

    storyText = this.add.text(50, 50, "", {
        fontFamily: 'Kanit, Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        wordWrap: { width: 700 }
    });
    mainContainer.add(storyText);

    choiceContainer = this.add.container(0, 0);
    mainContainer.add(choiceContainer);

    // 3. Status UI
    statusText = this.add.text(600, 20, "HP: 100/100\nEP: 50/50", {
        fontFamily: 'Kanit, Arial, sans-serif',
        fontSize: '18px',
        color: '#00ff00',
        align: 'right'
    });

    // 4. Inventory UI (Button + Modal)
    createInventoryUI(this);

    // Start Game
    startNewGame(this);
}

function update() {
    statusText.setText(`HP: ${gameState.hp}/${gameState.maxHp}\nEP: ${gameState.ep}/${gameState.maxEp}`);
}

// --- Logic ---

function startNewGame(scene) {
    gameState.hp = 100;
    gameState.ep = 50;
    gameState.inventory = [
        { id: 'potion', name: 'ยาเติมเลือด', type: 'consumable', effect: 'hp+20' },
        { id: 'ether', name: 'อีเธอร์', type: 'consumable', effect: 'ep+10' }
    ];
    gameState.equipment = { weapon: null, armor: null };
    gameState.mode = 'idle';
    loadScene(scene, 'start');
}

function loadScene(scene, sceneKey) {
    // Check for special Battle trigger
    if (sceneKey === 'BATTLE_START') {
        startBattle(scene);
        return;
    }

    gameState.currentScene = sceneKey;
    gameState.mode = 'idle';
    updateInventoryButtonState();

    const data = storyData[sceneKey];

    if (data.bgColor) backgroundRect.fillColor = data.bgColor;
    if (data.textColor) storyText.setColor(data.textColor);
    else storyText.setColor('#ffffff');

    // Item Pickup Logic
    if (data.item) {
        const hasItem = gameState.inventory.some(i => i.id === data.item.id);
        if (!hasItem) {
            gameState.inventory.push(data.item);
            alert(`ได้รับ: ${data.item.name}`); // Temporary feedback
        }
    }

    storyText.setText(data.text);

    // Add "Survey" choice dynamically if not start/end
    let currentChoices = [...data.choices];

    // If it's a standard room, add "Survey"
    if (!['start', 'end_win', 'end_coward'].includes(sceneKey)) {
        currentChoices.push({ text: `สำรวจ (ใช้ EP)`, type: 'survey' });
    }

    createChoices(scene, currentChoices);
}

function createChoices(scene, choices) {
    choiceContainer.removeAll(true);
    let yPos = 400;

    choices.forEach((choice) => {
        const btnBg = scene.add.rectangle(400, yPos, 600, 40, 0x444444);
        const btnText = scene.add.text(400, yPos, choice.text, {
            fontFamily: 'Kanit, Arial, sans-serif', fontSize: '20px', color: '#ffffff'
        }).setOrigin(0.5);

        btnBg.setInteractive({ useHandCursor: true });

        btnBg.on('pointerdown', () => {
            if (choice.type === 'survey') {
                performSurvey(scene);
            } else if (choice.next) {
                loadScene(scene, choice.next);
            } else if (choice.action) {
                choice.action(); // For Battle/Event actions
            }
        });

        choiceContainer.add([btnBg, btnText]);
        yPos += 50;
    });
}

function performSurvey(scene) {
    const cost = 2; // Fixed cost or per room
    if (gameState.ep < cost) {
        alert("EP ไม่พอ!");
        return;
    }
    gameState.ep -= cost;

    // Random Event Logic
    const rand = Math.random();
    if (rand < 0.3) {
        // 30% Battle
        startBattle(scene);
    } else if (rand < 0.6) {
        // 30% Event
        startEvent(scene);
    } else {
        // 40% Nothing / Lore
        const data = storyData[gameState.currentScene];
        const flavor = data.surveyText || "ไม่มีอะไรเป็นพิเศษ...";
        storyText.setText(`${data.text}\n\n[จากการสำรวจ]: ${flavor}`);
    }
}

// --- Battle System ---

function startBattle(scene) {
    gameState.mode = 'battle';
    updateInventoryButtonState();

    backgroundRect.fillColor = 0x990000; // Red tint
    storyText.setText("มอนสเตอร์ปรากฏตัว!\nเตรียมต่อสู้! (ใช้ของในกระเป๋าไม่ได้)");

    // Define Battle Choices
    const battleChoices = [
        { text: "โจมตี", action: () => resolveBattleRound(scene, 'attack') },
        { text: "ป้องกัน", action: () => resolveBattleRound(scene, 'defend') },
        { text: "หลบหนี", action: () => {
            alert("หนีสำเร็จ!");
            loadScene(scene, gameState.currentScene); // Reset to idle
        }}
    ];
    createChoices(scene, battleChoices);
}

function resolveBattleRound(scene, action) {
    // Simple mock logic
    let dmgToMonster = 0;
    let dmgToPlayer = 10;

    if (action === 'attack') {
        const weapon = gameState.equipment.weapon;
        dmgToMonster = weapon ? weapon.atk : 2; // Base dmg
        storyText.setText(`คุณโจมตีทำดาเมจ ${dmgToMonster}!\nมอนสเตอร์สวนกลับทำดาเมจ ${dmgToPlayer}!`);
    } else if (action === 'defend') {
        dmgToPlayer = Math.floor(dmgToPlayer / 2);
        storyText.setText(`คุณป้องกัน!\nโดนดาเมจลดเหลือ ${dmgToPlayer}.`);
    }

    gameState.hp -= dmgToPlayer;
    if (gameState.hp <= 0) {
        gameState.hp = 0;
        loadScene(scene, 'death_fight'); // Assuming this exists in storyData, wait, need to check
        // Ideally we should have a generic Game Over or link to death_fight logic
        // For now, let's just push to death_fight scene if valid, or alert
        // storyData has 'death_fight'.
        loadScene(scene, 'death_fight');
    } else {
        // Assume Monster HP logic or just random win chance for prototype
        if (Math.random() > 0.5) {
             storyText.setText(storyText.text + "\n\nคุณจัดการมอนสเตอร์ได้!");

             // Back to idle
             setTimeout(() => {
                 loadScene(scene, gameState.currentScene);
             }, 1500);
        }
    }
}

function useOrEquipItem(scene, index) {
    const item = gameState.inventory[index];
    if (!item) return;

    if (item.type === 'consumable') {
        if (item.effect.startsWith('hp+')) {
            const val = parseInt(item.effect.split('+')[1]);
            gameState.hp = Math.min(gameState.hp + val, gameState.maxHp);
            alert(`ใช้ไอเทม: ${item.name} ฟื้นฟู HP`);
        } else if (item.effect.startsWith('ep+')) {
            const val = parseInt(item.effect.split('+')[1]);
            gameState.ep = Math.min(gameState.ep + val, gameState.maxEp);
            alert(`ใช้ไอเทม: ${item.name} ฟื้นฟู EP`);
        }
        // Remove item
        gameState.inventory.splice(index, 1);
        renderInventoryGrid(); // Refresh grid
    }
    else if (item.type === 'weapon') {
        // Toggle Equip
        if (gameState.equipment.weapon === item) {
            gameState.equipment.weapon = null; // Unequip
            alert(`ถอดอุปกรณ์: ${item.name}`);
        } else {
            gameState.equipment.weapon = item; // Equip
            alert(`สวมใส่: ${item.name}`);
        }
    }
}

// --- Event System ---

function startEvent(scene) {
    gameState.mode = 'event';
    updateInventoryButtonState();

    backgroundRect.fillColor = 0x000099; // Blue tint
    storyText.setText("คุณพบกล่องสมบัติเก่าๆ...");

    const eventChoices = [
        { text: "เปิดดู", action: () => {
            const loot = { id: 'potion', name: 'ยาเติมเลือด', type: 'consumable', effect: 'hp+20' };
            gameState.inventory.push(loot);
            storyText.setText("คุณได้รับ: ยาเติมเลือด!");
            setTimeout(() => {
                loadScene(scene, gameState.currentScene);
            }, 1500);
        }},
        { text: "เมินเฉย", action: () => {
             loadScene(scene, gameState.currentScene);
        }}
    ];
    createChoices(scene, eventChoices);
}


// --- Inventory UI ---

function createInventoryUI(scene) {
    // 1. Toggle Button (Bottom Right)
    inventoryButton = scene.add.container(720, 550);
    const btnBg = scene.add.rectangle(0, 0, 120, 50, 0x885500).setStrokeStyle(2, 0xffffff);
    const btnTxt = scene.add.text(0, 0, "กระเป๋า", { fontFamily: 'Kanit', fontSize: '20px' }).setOrigin(0.5);
    inventoryButton.add([btnBg, btnTxt]);

    btnBg.setInteractive({ useHandCursor: true });
    btnBg.on('pointerdown', () => {
        if (gameState.mode === 'idle') {
            toggleInventory(true);
        } else {
            // Shake or sound to indicate disabled?
            console.log("Cannot open inventory in this mode");
        }
    });

    // 2. Inventory Modal Layer
    inventoryLayer = scene.add.container(0, 0);
    inventoryLayer.setVisible(false);

    // Dark overlay
    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.85);
    overlay.setInteractive(); // Block input
    inventoryLayer.add(overlay);

    // Close Button
    const closeBtn = scene.add.text(750, 50, "X", { fontSize: '30px', color: '#ff0000' }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => toggleInventory(false));
    inventoryLayer.add(closeBtn);

    // Grid Container
    inventoryGrid = scene.add.container(400, 300);
    inventoryLayer.add(inventoryGrid);

    // Description Text
    inventoryDesc = scene.add.text(400, 500, "", { fontFamily: 'Kanit', fontSize: '18px', color: '#ffff00' }).setOrigin(0.5);
    inventoryLayer.add(inventoryDesc);
}

function toggleInventory(show) {
    inventoryLayer.setVisible(show);
    if (show) {
        renderInventoryGrid();
    }
}

function updateInventoryButtonState() {
    // Visual feedback if disabled
    const alpha = gameState.mode === 'idle' ? 1 : 0.5;
    inventoryButton.setAlpha(alpha);
}

function renderInventoryGrid() {
    inventoryGrid.removeAll(true);
    const scene = game.scene.scenes[0]; // Hacky access or pass scene

    const startX = -(9 * 34) / 2 + 17;
    const startY = -(5 * 34) / 2; // Center vertically somewhat

    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;

        const x = startX + (col * 34);
        const y = startY + (row * 34);

        const slotBg = scene.add.rectangle(x, y, 30, 30, 0x333333).setStrokeStyle(1, 0x888888);
        inventoryGrid.add(slotBg);

        if (i < gameState.inventory.length) {
            const item = gameState.inventory[i];
            let color = 0xffffff;
            if (item.type === 'weapon') color = 0xff0000;
            if (item.type === 'consumable') color = 0x00ff00;

            const itemIcon = scene.add.rectangle(x, y, 20, 20, color);
            inventoryGrid.add(itemIcon);

            itemIcon.setInteractive({ useHandCursor: true });
            itemIcon.on('pointerover', () => {
                inventoryDesc.setText(`${item.name}: ${item.effect || 'อุปกรณ์สวมใส่'}`);
            });
            itemIcon.on('pointerdown', () => {
                useOrEquipItem(scene, i);
            });
        }
    }
}

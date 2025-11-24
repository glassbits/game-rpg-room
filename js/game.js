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
    inventory: [], // Array of objects {id: 'item_id', name: 'Name', type: 'consumable/equip', effect: ...}
    equipment: {
        weapon: null,
        armor: null
    },
    hp: 100,
    maxHp: 100,
    ep: 50,
    maxEp: 50,
    currentScene: 'start'
};

// --- Story Data ---
const storyData = {
    'start': {
        text: "คุณยืนอยู่หน้าปากทางเข้าดันเจี้ยนโบราณ\nกลิ่นอับชื้นโชยออกมา...",
        bgColor: 0x2c3e50,
        surveyText: "ทางเข้าดูเงียบสงบ แต่รู้สึกถึงพลังงานบางอย่างข้างใน",
        surveyCost: 5,
        choices: [
            { text: "จุดไฟแช็กและเดินเข้าไป", next: 'hallway', req: null },
            { text: "หนีกลับบ้านดีกว่า", next: 'end_coward', req: null }
        ]
    },
    'hallway': {
        text: "ทางเดินมืดสนิท แสงไฟส่องเห็นประตูสองบาน\nทางซ้ายดูเหมือนห้องเก็บของ ทางขวามีเสียงคำราม",
        bgColor: 0x34495e,
        surveyText: "ได้ยินเสียงหนูวิ่ง และเสียงหยดน้ำ",
        surveyCost: 2,
        choices: [
            { text: "เข้าประตูซ้าย (ห้องเก็บของ)", next: 'storage_room' },
            { text: "เข้าประตูขวา (ห้องมอนสเตอร์)", next: 'monster_room' }
        ]
    },
    'storage_room': {
        text: "ห้องเต็มไปด้วยฝุ่น คุณเห็น 'ดาบเก่าๆ' วางอยู่บนโต๊ะ",
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
        surveyText: "ทางขวายังคงมีเสียงคำราม",
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
            { text: "สู้!", next: 'combat_resolution' }, // Logic handled in resolution
            { text: "วิ่งหนี", next: 'hallway' }
        ]
    },
    'combat_resolution': {
        text: "", // Will be dynamic
        bgColor: 0x000000,
        choices: [
            { text: "กลับจุดเริ่มต้น", next: 'start' }
        ]
    },
    'death_fight': {
        text: "คุณพ่ายแพ้...\n(GAME OVER)",
        bgColor: 0x000000,
        choices: [
            { text: "เริ่มใหม่", next: 'start' }
        ]
    },
    'victory': {
        text: "ฉัวะ! คุณชนะ!\nทางเดินข้างหน้าเปิดโล่งสู่สมบัติ!",
        bgColor: 0xf1c40f,
        choices: [
            { text: "ไปต่อ (จบเดโม)", next: 'end_win' }
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
let uiLayer;
let prepLayer;

let storyText;
let statusText; // HP/EP display
let choiceContainer;
let backgroundRect;

// Prep UI Elements
let prepTitle;
let prepDesc;
let prepSurveyBtn;
let prepEnterBtn;
let prepCancelBtn;
let inventoryGrid; // Container for grid slots

function preload() {
    // No assets yet
}

function create() {
    // 1. Background
    backgroundRect = this.add.rectangle(400, 300, 800, 600, 0x000000);

    // 2. Main Gameplay Layer
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

    // 3. Status UI (Always visible top right or bottom)
    statusText = this.add.text(600, 20, "HP: 100/100\nEP: 50/50", {
        fontFamily: 'Kanit, Arial, sans-serif',
        fontSize: '18px',
        color: '#00ff00',
        align: 'right'
    });

    // 4. Prep/Inventory Layer (Initially Hidden)
    createPrepUI(this);

    // Start Game
    startNewGame(this);
}

function update() {
    // Update HP/EP display
    statusText.setText(`HP: ${gameState.hp}/${gameState.maxHp}\nEP: ${gameState.ep}/${gameState.maxEp}`);
}

// --- Logic ---

function startNewGame(scene) {
    gameState.hp = 100;
    gameState.ep = 50;
    gameState.inventory = [];
    // Add some starting items for testing
    gameState.inventory.push({ id: 'potion', name: 'ยาเติมเลือด', type: 'consumable', effect: 'hp+20' });
    gameState.inventory.push({ id: 'ether', name: 'อีเธอร์', type: 'consumable', effect: 'ep+10' });

    gameState.equipment = { weapon: null, armor: null };
    loadScene(scene, 'start');
}

function loadScene(scene, sceneKey) {
    // Hide Prep UI, Show Main
    prepLayer.setVisible(false);
    mainContainer.setVisible(true);

    const data = storyData[sceneKey];
    gameState.currentScene = sceneKey;

    if (data.bgColor) backgroundRect.fillColor = data.bgColor;

    // Handle Items found in room
    if (data.item) {
        // Simple check if we already have it
        const hasItem = gameState.inventory.some(i => i.id === data.item.id);
        if (!hasItem) {
            gameState.inventory.push(data.item);
            // Alert (temp)
            alert(`ได้รับ: ${data.item.name}`);
        }
    }

    // Combat Resolution Logic (Special Case)
    if (sceneKey === 'combat_resolution') {
        resolveCombat(scene);
        return;
    }

    let displayColor = data.textColor || '#ffffff';
    storyText.setColor(displayColor);
    storyText.setText(data.text);

    createChoices(scene, data.choices);
}

function resolveCombat(scene) {
    // Simple logic: if has weapon, win. Else lose HP or die.
    const hasWeapon = gameState.equipment.weapon !== null;
    let resultText = "";
    let nextScene = "";

    if (hasWeapon) {
        resultText = "คุณใช้ดาบฟาดฟันก๊อบลินจนล้มลง! ชัยชนะเป็นของคุณ";
        nextScene = 'victory';
    } else {
        gameState.hp -= 50;
        if (gameState.hp <= 0) {
            resultText = "คุณโดนก๊อบลินทุบจนสลบ... (Game Over)";
            nextScene = 'death_fight';
        } else {
            resultText = "คุณเจ็บหนักแต่หนีออกมาได้ (HP -50)";
            nextScene = 'hallway';
        }
    }

    storyText.setText(resultText);
    createChoices(scene, [{ text: "ดำเนินการต่อ", next: nextScene }]);
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
            // Check if special ending or simple navigation
            if (['start', 'end_win', 'end_coward', 'combat_resolution', 'death_fight', 'victory'].includes(choice.next)) {
                // Direct transition
                loadScene(scene, choice.next);
            } else {
                // Open Prep Screen for the target room
                openPrepScreen(scene, choice.next);
            }
        });

        choiceContainer.add([btnBg, btnText]);
        yPos += 50;
    });
}

// --- Prep & Inventory UI ---

function createPrepUI(scene) {
    prepLayer = scene.add.container(0, 0);
    prepLayer.setVisible(false);

    // Background
    const bg = scene.add.rectangle(400, 300, 800, 600, 0x111111);
    bg.setInteractive(); // Block clicks through
    prepLayer.add(bg);

    // Title (Room Name/ID)
    prepTitle = scene.add.text(400, 50, "เตรียมตัวก่อนเข้า: ???", {
        fontFamily: 'Kanit', fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5);
    prepLayer.add(prepTitle);

    // Survey Text Area
    prepDesc = scene.add.text(400, 100, "ยังไม่ได้สำรวจ", {
        fontFamily: 'Kanit', fontSize: '20px', color: '#aaaaaa', align: 'center', wordWrap: { width: 600 }
    }).setOrigin(0.5, 0);
    prepLayer.add(prepDesc);

    // Buttons
    prepSurveyBtn = createButton(scene, 250, 200, "สำรวจ (-EP)", () => {});
    prepEnterBtn = createButton(scene, 550, 200, "เข้าไปข้างใน", () => {});
    prepCancelBtn = createButton(scene, 400, 250, "ยกเลิก", () => {
        prepLayer.setVisible(false);
        mainContainer.setVisible(true);
    });

    prepLayer.add([prepSurveyBtn, prepEnterBtn, prepCancelBtn]);

    // Inventory Grid (9x9)
    // 9 columns, 9 rows. Let's make slots 32x32 size.
    // Total width ~300px. Centered at bottom.
    inventoryGrid = scene.add.container(400, 420); // Center point
    prepLayer.add(inventoryGrid);
}

function createButton(scene, x, y, text, callback) {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, 200, 40, 0x666666);
    const txt = scene.add.text(0, 0, text, { fontFamily: 'Kanit', fontSize: '18px', color: '#fff' }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', callback);

    container.add([bg, txt]);
    container.setData('bg', bg);
    container.setData('txt', txt);
    return container;
}

function openPrepScreen(scene, targetSceneKey) {
    const targetData = storyData[targetSceneKey];

    // Switch Views
    mainContainer.setVisible(false);
    prepLayer.setVisible(true);

    // Reset UI state
    prepTitle.setText(`เป้าหมาย: ${targetSceneKey}`); // Use key or map name if available
    prepDesc.setText("???");

    // Config Buttons
    const surveyCost = targetData.surveyCost || 0;

    // Survey Button Logic
    const surveyBtnData = prepSurveyBtn.getData('bg');
    const surveyTxtData = prepSurveyBtn.getData('txt');

    surveyTxtData.setText(`สำรวจ (-${surveyCost} EP)`);
    surveyBtnData.off('pointerdown');
    surveyBtnData.on('pointerdown', () => {
        if (gameState.ep >= surveyCost) {
            gameState.ep -= surveyCost;
            prepDesc.setText(targetData.surveyText || "ไม่มีข้อมูลพิเศษ");
        } else {
            prepDesc.setText("EP ไม่พอสำหรับการสำรวจ!");
        }
    });

    // Enter Button Logic
    const enterBtnData = prepEnterBtn.getData('bg');
    enterBtnData.off('pointerdown');
    enterBtnData.on('pointerdown', () => {
        loadScene(scene, targetSceneKey);
    });

    renderInventory(scene);
}

function renderInventory(scene) {
    inventoryGrid.removeAll(true);

    // 9x9 Grid centered
    const startX = -(9 * 34) / 2 + 17; // 34px spacing
    const startY = 0;

    for (let i = 0; i < 81; i++) { // 9x9 = 81 slots
        const row = Math.floor(i / 9);
        const col = i % 9;

        const x = startX + (col * 34);
        const y = startY + (row * 34);

        const slotBg = scene.add.rectangle(x, y, 30, 30, 0x333333).setStrokeStyle(1, 0x888888);
        inventoryGrid.add(slotBg);

        // Item Content
        if (i < gameState.inventory.length) {
            const item = gameState.inventory[i];

            // Visual Indicator (Text abbreviation or color)
            let color = 0xffffff;
            if (item.type === 'weapon') color = 0xff0000;
            if (item.type === 'consumable') color = 0x00ff00;

            const itemIcon = scene.add.rectangle(x, y, 20, 20, color);
            inventoryGrid.add(itemIcon);

            // Interaction
            itemIcon.setInteractive({ useHandCursor: true });
            itemIcon.on('pointerdown', () => {
                useOrEquipItem(scene, i);
            });

            // Hover tooltip (simple console log or text update for now)
            itemIcon.on('pointerover', () => {
                prepDesc.setText(`${item.name}: ${item.effect || item.type}`);
            });
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
        } else if (item.effect.startsWith('ep+')) {
            const val = parseInt(item.effect.split('+')[1]);
            gameState.ep = Math.min(gameState.ep + val, gameState.maxEp);
        }
        // Remove 1
        gameState.inventory.splice(index, 1);
        renderInventory(scene);
    }
    else if (item.type === 'weapon') {
        // Toggle Equip
        if (gameState.equipment.weapon === item) {
            gameState.equipment.weapon = null; // Unequip
        } else {
            gameState.equipment.weapon = item; // Equip
        }
        // Force refresh to show status? (Visual distinction needed for equipped items)
        prepDesc.setText(`สวมใส่ ${item.name} แล้ว`);
    }
}

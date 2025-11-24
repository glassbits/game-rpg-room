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
    currentScene: 'start',
    hp: 100
};

// --- Story Data ---
// This object defines the scenes, text, choices, and items
const storyData = {
    'start': {
        text: "คุณยืนอยู่หน้าปากทางเข้าดันเจี้ยนโบราณ\nกลิ่นอับชื้นโชยออกมา...",
        bgColor: 0x2c3e50, // Dark Blue
        choices: [
            { text: "จุดไฟแช็กและเดินเข้าไป", next: 'hallway', req: null },
            { text: "หนีกลับบ้านดีกว่า", next: 'end_coward', req: null }
        ]
    },
    'hallway': {
        text: "ทางเดินมืดสนิท แสงไฟส่องเห็นประตูสองบาน\nทางซ้ายดูเหมือนห้องเก็บของ ทางขวามีเสียงคำราม",
        bgColor: 0x34495e,
        choices: [
            { text: "เข้าประตูซ้าย (ห้องเก็บของ)", next: 'storage_room' },
            { text: "เข้าประตูขวา (ห้องมอนสเตอร์)", next: 'monster_room' }
        ]
    },
    'storage_room': {
        text: "ห้องเต็มไปด้วยฝุ่น คุณเห็น 'ดาบเก่าๆ' วางอยู่บนโต๊ะ",
        bgColor: 0x7f8c8d, // Grey
        item: 'old_sword', // Scene gives an item
        choices: [
            { text: "หยิบดาบ แล้วกลับไปทางเดิน", next: 'hallway_with_sword' }
        ]
    },
    'hallway_with_sword': {
        text: "คุณกลับมาที่ทางเดินพร้อมดาบในมือ\nตอนนี้คุณรู้สึกกล้าหาญขึ้น",
        bgColor: 0x34495e,
        choices: [
            { text: "บุกเข้าประตูขวา! (ห้องมอนสเตอร์)", next: 'monster_room' }
        ]
    },
    'monster_room': {
        text: "ก๊อบลินตัวเขียวยืนขวางทางอยู่! มันดูหิวโหย",
        bgColor: 0xc0392b, // Red
        choices: [
            { text: "สู้ด้วยมือเปล่า", next: 'death_fight', req: null },
            { text: "ใช้ดาบโจมตี!", next: 'victory', req: 'old_sword' }, // Requires item
            { text: "วิ่งหนี", next: 'hallway' }
        ]
    },
    'death_fight': {
        text: "คุณพยายามสู้แต่มือเปล่าทำอะไรมันไม่ได้...\nคุณถูกก๊อบลินจัดการ\n(GAME OVER)",
        bgColor: 0x000000,
        choices: [
            { text: "เริ่มใหม่", next: 'start' }
        ]
    },
    'victory': {
        text: "ฉัวะ! คุณจัดการก๊อบลินได้สำเร็จ\nทางเดินข้างหน้าเปิดโล่งสู่สมบัติ!",
        bgColor: 0xf1c40f, // Gold
        choices: [
            { text: "ไปต่อ (จบเดโม)", next: 'end_win' }
        ]
    },
    'end_coward': {
        text: "คุณตัดสินใจกลับบ้านไปนอน... ปลอดภัยไว้ก่อนนะ\n(BAD ENDING)",
        bgColor: 0xffffff,
        textColor: '#000000',
        choices: [
            { text: "ลองใหม่อีกครั้ง", next: 'start' }
        ]
    },
    'end_win': {
        text: "ยินดีด้วย! คุณผ่านด่านทดสอบแรกแล้ว\nติดตามต่อในเวอร์ชั่นเต็ม...",
        bgColor: 0x2ecc71, // Green
        choices: [
            { text: "เล่นใหม่", next: 'start' }
        ]
    }
};

// --- Global UI Variables ---
let titleText;
let storyText;
let choiceContainer;
let inventoryText;
let backgroundRect;

function preload() {
    // Load assets here (images, sounds)
    // For this example, we use code-generated graphics
}

function create() {
    // 1. Background (Placeholder)
    backgroundRect = this.add.rectangle(400, 300, 800, 600, 0x000000);

    // 2. UI Container Area (Bottom part)
    const uiBg = this.add.rectangle(400, 500, 780, 180, 0x000000, 0.8);
    uiBg.setStrokeStyle(2, 0xffffff);

    // 3. Text Objects
    // Main Story Text
    storyText = this.add.text(50, 50, "", {
        fontFamily: 'Kanit, Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        wordWrap: { width: 700 }
    });

    // Inventory Display
    inventoryText = this.add.text(50, 420, "Inventory: Empty", {
        fontFamily: 'Kanit, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffff00'
    });

    // Choice Container (Group)
    choiceContainer = this.add.container(0, 0);

    // Start the Game
    loadScene(this, 'start');
}

function update() {
    // Unused for this simple VN style
}

// --- Core Logic ---

function loadScene(sceneCtx, sceneKey) {
    const data = storyData[sceneKey];
    gameState.currentScene = sceneKey;

    // Update Background Color
    if (data.bgColor) {
        backgroundRect.fillColor = data.bgColor;
    }

    // Handle Item Pickup
    if (data.item) {
        if (!gameState.inventory.includes(data.item)) {
            gameState.inventory.push(data.item);
            updateInventoryDisplay();
            // Alert user (simple append to text for now)
            data.text += `\n\n[ได้รับไอเทม: ${data.item}]`;
        }
    }

    // Handle Special Reset (Game Over/Restart)
    if (sceneKey === 'start') {
        gameState.inventory = [];
        updateInventoryDisplay();
    }

    // Update Story Text
    let displayColor = data.textColor || '#ffffff';
    storyText.setColor(displayColor);
    storyText.setText(data.text);

    // Create Choices
    createChoices(sceneCtx, data.choices);
}

function createChoices(sceneCtx, choices) {
    // Clear old choices
    choiceContainer.removeAll(true);

    let yPos = 460; // Starting Y position for buttons

    choices.forEach((choice) => {
        // Check requirements (Does player have the item?)
        let canChoose = true;
        let label = choice.text;

        if (choice.req) {
            if (!gameState.inventory.includes(choice.req)) {
                canChoose = false;
                label = `[ต้องใช้ ${choice.req}] ${choice.text}`; // Greyed out hint
            }
        }

        // Create Button Background
        const btnBg = sceneCtx.add.rectangle(400, yPos, 700, 40, 0x444444);
        btnBg.setInteractive({ useHandCursor: canChoose });

        // Create Button Text
        const btnText = sceneCtx.add.text(400, yPos, label, {
            fontFamily: 'Kanit, Arial, sans-serif',
            fontSize: '20px',
            color: canChoose ? '#ffffff' : '#888888'
        }).setOrigin(0.5);

        // Interactions
        if (canChoose) {
            btnBg.on('pointerover', () => btnBg.setFillStyle(0x666666));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x444444));
            btnBg.on('pointerdown', () => {
                loadScene(sceneCtx, choice.next);
            });
        }

        // Add to container
        choiceContainer.add([btnBg, btnText]);

        yPos += 50; // Move down for next button
    });
}

function updateInventoryDisplay() {
    if (gameState.inventory.length === 0) {
        inventoryText.setText("กระเป๋า: ว่างเปล่า");
    } else {
        inventoryText.setText("กระเป๋า: " + gameState.inventory.join(", "));
    }
}

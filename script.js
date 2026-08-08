// ===================================
// GAME ELEMENTS
// ===================================

const startButton =
    document.getElementById("start-button");

const playerSection =
    document.getElementById("player-section");

const gameSection =
    document.getElementById("game-section");

const firstNameInput =
    document.getElementById("first-name");

const lastNameInput =
    document.getElementById("last-name");

const workEmailInput =
    document.getElementById("work-email");

const playerNameDisplay =
    document.getElementById("player-name-display");

const gameBoard =
    document.getElementById("game-board");

const testObject =
    document.getElementById("test-object");

const testCavity =
    document.getElementById("test-cavity");

const dropZone =
    document.getElementById("drop-zone");

const tongs =
    document.getElementById("tongs");

const ticketCountDisplay =
    document.getElementById("ticket-count");

const objectsRemovedDisplay =
    document.getElementById("objects-removed-count");

const gingerbreadNose =
    document.getElementById("gingerbread-nose");


// ===================================
// GAME VARIABLES
// ===================================

let tickets = 10;

let objectsRemoved = 0;

let isDragging = false;

let collisionCooldown = false;

let rollingPinExtracted = false;

let rollingPinRemoved = false;

let startingX = null;

let startingY = null;

let activePointerId = null;


// ===================================
// START GAME
// ===================================

startButton.addEventListener(
    "click",
    function () {

        const firstName =
            firstNameInput.value.trim();

        const lastName =
            lastNameInput.value.trim();

        const workEmail =
            workEmailInput.value.trim();


        if (
            firstName === "" ||
            lastName === "" ||
            workEmail === ""
        ) {

            alert(
                "Please enter your first name, last name, and work email."
            );

            return;
        }


        if (
            !workEmail.includes("@") ||
            !workEmail.includes(".")
        ) {

            alert(
                "Please enter a valid work email."
            );

            return;
        }


        playerNameDisplay.textContent =
            `Good luck, ${firstName}!`;


        playerSection.style.display =
            "none";

        gameSection.style.display =
            "block";


        requestAnimationFrame(
            function () {

                startingX =
                    testObject.offsetLeft;

                startingY =
                    testObject.offsetTop;


                console.log(
                    "Rolling pin starting position:",
                    startingX,
                    startingY
                );

            }
        );


        console.log(
            "Player started game:",
            firstName,
            lastName,
            workEmail
        );

    }
);


// ===================================
// TONG MOVEMENT
// ===================================

gameBoard.addEventListener(
    "pointerenter",
    function () {

        if (tickets > 0) {

            tongs.style.display =
                "block";

        }

    }
);


gameBoard.addEventListener(
    "pointerleave",
    function () {

        if (!isDragging) {

            tongs.style.display =
                "none";

        }

    }
);


document.addEventListener(
    "pointermove",
    function (event) {

        if (
            gameSection.style.display !==
            "block"
        ) {

            return;
        }


        const boardRect =
            gameBoard.getBoundingClientRect();


        const insideBoard =

            event.clientX >=
                boardRect.left &&

            event.clientX <=
                boardRect.right &&

            event.clientY >=
                boardRect.top &&

            event.clientY <=
                boardRect.bottom;


        if (
            !insideBoard &&
            !isDragging
        ) {

            tongs.style.display =
                "none";

            return;

        }


        if (tickets <= 0) {

            tongs.style.display =
                "none";

            return;

        }


        tongs.style.display =
            "block";


        let tongX =
            event.clientX -
            boardRect.left;


        let tongY =
            event.clientY -
            boardRect.top;


        tongX = Math.max(
            0,
            Math.min(
                tongX,
                boardRect.width
            )
        );


        tongY = Math.max(
            0,
            Math.min(
                tongY,
                boardRect.height
            )
        );


        tongs.style.left =
            tongX + "px";


        tongs.style.top =
            tongY + "px";

    }
);


// ===================================
// PICK UP ROLLING PIN
// ===================================

testObject.addEventListener(
    "pointerdown",
    function (event) {

        if (rollingPinRemoved) {

            return;

        }


        if (tickets <= 0) {

            return;

        }


        if (collisionCooldown) {

            return;

        }


        if (
            startingX === null ||
            startingY === null
        ) {

            startingX =
                testObject.offsetLeft;

            startingY =
                testObject.offsetTop;

        }


        event.preventDefault();


        isDragging = true;

        activePointerId =
            event.pointerId;


        testObject.setPointerCapture(
            event.pointerId
        );


        tongs.classList.add(
            "closed"
        );

    }
);


// ===================================
// DRAG ROLLING PIN
// ===================================

testObject.addEventListener(
    "pointermove",
    function (event) {

        if (!isDragging) {

            return;

        }


        if (collisionCooldown) {

            return;

        }


        const boardRect =
            gameBoard.getBoundingClientRect();


        const cavityRect =
            testCavity.getBoundingClientRect();


        const objectWidth =
            testObject.offsetWidth;


        const objectHeight =
            testObject.offsetHeight;


        // ===================================
        // CALCULATE WHERE THE OBJECT
        // IS TRYING TO MOVE
        // ===================================

        let newX =
            event.clientX -
            boardRect.left -
            objectWidth / 2;


        let newY =
            event.clientY -
            boardRect.top -
            objectHeight / 2;


        // Convert proposed object position
        // into browser/page coordinates.

        const proposedLeft =
            boardRect.left +
            newX;


        const proposedRight =
            proposedLeft +
            objectWidth;


        const proposedTop =
            boardRect.top +
            newY;


        const proposedBottom =
            proposedTop +
            objectHeight;


        // ===================================
        // DEFINE THE SAFE INSIDE OF THE U
        // ===================================

        // This approximately matches the
        // visible thickness of the brown walls.

        const wallThickness = 8;


        const safeLeft =
            cavityRect.left +
            wallThickness;


        const safeRight =
            cavityRect.right -
            wallThickness;


        const safeBottom =
            cavityRect.bottom -
            wallThickness;


        // ===================================
        // CHECK WHETHER OBJECT IS STILL
        // VERTICALLY INSIDE THE CAVITY
        // ===================================

        const objectStillInCavity =

            proposedBottom >
                cavityRect.top &&

            proposedTop <
                cavityRect.bottom;


        // ===================================
        // COLLISION WITH LEFT OR RIGHT WALL
        // ===================================

        const hitsLeftWall =

            objectStillInCavity &&

            proposedLeft <=
                safeLeft;


        const hitsRightWall =

            objectStillInCavity &&

            proposedRight >=
                safeRight;


        // ===================================
        // COLLISION WITH BOTTOM WALL
        // ===================================

        const horizontallyInsideCavity =

            proposedRight >
                cavityRect.left &&

            proposedLeft <
                cavityRect.right;


        const hitsBottomWall =

            horizontallyInsideCavity &&

            proposedBottom >=
                safeBottom &&

            proposedTop <
                cavityRect.bottom;


        // ===================================
        // COLLISION ONLY BEFORE EXTRACTION
        // ===================================

        if (!rollingPinExtracted) {

            if (
                hitsLeftWall ||
                hitsRightWall ||
                hitsBottomWall
            ) {

                triggerCollision();

                return;

            }

        }


        // ===================================
        // KEEP OBJECT INSIDE GAME BOARD
        // ===================================

        newX = Math.max(
            0,
            Math.min(
                newX,
                gameBoard.clientWidth -
                    objectWidth
            )
        );


        newY = Math.max(
            0,
            Math.min(
                newY,
                gameBoard.clientHeight -
                    objectHeight
            )
        );


        // ===================================
        // MOVE THE OBJECT
        // ===================================

        testObject.style.left =
            newX + "px";


        testObject.style.top =
            newY + "px";


        // ===================================
        // CHECK FOR SAFE EXTRACTION
        // ===================================

        // The entire rolling pin must clear
        // the open TOP of the cavity.

        const movedObjectRect =
            testObject.getBoundingClientRect();


        if (
            !rollingPinExtracted &&
            movedObjectRect.bottom <
                cavityRect.top
        ) {

            rollingPinExtracted =
                true;


            dropZone.classList.add(
                "ready"
            );


            const trayMessage =
                dropZone.querySelector("p");


            trayMessage.textContent =
                "Safe extraction! Drop the item here.";


            console.log(
                "Rolling pin safely extracted!"
            );

        }

    }
);


// ===================================
// RELEASE ROLLING PIN
// ===================================

testObject.addEventListener(
    "pointerup",
    function (event) {

        const objectRect =
            testObject.getBoundingClientRect();


        const dropRect =
            dropZone.getBoundingClientRect();


        const objectCenterX =
            objectRect.left +
            objectRect.width / 2;


        const objectCenterY =
            objectRect.top +
            objectRect.height / 2;


        const droppedInTray =

            objectCenterX >=
                dropRect.left &&

            objectCenterX <=
                dropRect.right &&

            objectCenterY >=
                dropRect.top &&

            objectCenterY <=
                dropRect.bottom;


        isDragging = false;


        tongs.classList.remove(
            "closed"
        );


        if (
            testObject.hasPointerCapture(
                event.pointerId
            )
        ) {

            testObject.releasePointerCapture(
                event.pointerId
            );

        }


        activePointerId = null;


        if (
            rollingPinExtracted &&
            droppedInTray
        ) {

            completeRollingPin();

        }

    }
);


// ===================================
// POINTER CANCEL
// ===================================

testObject.addEventListener(
    "pointercancel",
    function () {

        isDragging = false;


        tongs.classList.remove(
            "closed"
        );


        activePointerId = null;

    }
);


// ===================================
// BUZZ SOUND
// ===================================

function playBuzz() {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


    const audioContext =
        new AudioContext();


    const oscillator =
        audioContext.createOscillator();


    const gainNode =
        audioContext.createGain();


    oscillator.type =
        "sawtooth";


    oscillator.frequency.value =
        120;


    oscillator.connect(
        gainNode
    );


    gainNode.connect(
        audioContext.destination
    );


    gainNode.gain.setValueAtTime(
        0.15,
        audioContext.currentTime
    );


    oscillator.start();


    oscillator.stop(
        audioContext.currentTime +
        0.25
    );

}


// ===================================
// COLLISION / MISTAKE
// ===================================

function triggerCollision() {

    if (collisionCooldown) {

        return;

    }


    collisionCooldown = true;


    isDragging = false;


    rollingPinExtracted = false;


    dropZone.classList.remove(
        "ready"
    );


    const trayMessage =
        dropZone.querySelector("p");


    trayMessage.textContent =
        "Safely extract an item first.";


    // Release pointer capture.

    if (
        activePointerId !== null &&
        testObject.hasPointerCapture(
            activePointerId
        )
    ) {

        testObject.releasePointerCapture(
            activePointerId
        );

    }


    activePointerId = null;


    // Lose ticket.

    tickets--;


    if (tickets < 0) {

        tickets = 0;

    }


    ticketCountDisplay.textContent =
        tickets;


    // Red nose.

    gingerbreadNose.classList.add(
        "buzzing"
    );


    // Sound.

    playBuzz();


    // Open tongs.

    tongs.classList.remove(
        "closed"
    );


    // Return rolling pin to start.

    testObject.style.left =
        startingX + "px";


    testObject.style.top =
        startingY + "px";


    // Turn nose off.

    setTimeout(
        function () {

            gingerbreadNose.classList.remove(
                "buzzing"
            );

        },
        500
    );


    // Allow another attempt.

    setTimeout(
        function () {

            collisionCooldown = false;

        },
        750
    );


    if (tickets <= 0) {

        setTimeout(
            function () {

                alert(
                    "Game Over! You ran out of tickets."
                );

            },
            300
        );

    }

}


// ===================================
// SUCCESSFUL REMOVAL
// ===================================

function completeRollingPin() {

    if (rollingPinRemoved) {

        return;

    }


    rollingPinRemoved = true;


    objectsRemoved++;


    objectsRemovedDisplay.textContent =
        `${objectsRemoved} / 3`;


    // ===================================
    // SNAP ROLLING PIN TO TRAY CENTER
    // ===================================

    const boardRect =
        gameBoard.getBoundingClientRect();


    const dropRect =
        dropZone.getBoundingClientRect();


    const objectWidth =
        testObject.offsetWidth;


    const objectHeight =
        testObject.offsetHeight;


    const trayCenterX =
        dropRect.left -
        boardRect.left +
        dropRect.width / 2;


    const trayCenterY =
        dropRect.top -
        boardRect.top +
        dropRect.height / 2;


    testObject.style.left =
        trayCenterX -
        objectWidth / 2 +
        "px";


    testObject.style.top =
        trayCenterY -
        objectHeight / 2 +
        "px";


    // Lock completed item.

    testObject.style.pointerEvents =
        "none";


    // Update tray.

    dropZone.classList.remove(
        "ready"
    );


    dropZone.classList.add(
        "completed"
    );


    const trayMessage =
        dropZone.querySelector("p");


    trayMessage.textContent =
        "✓ Rolling Pin Removed";


    console.log(
        "Rolling pin successfully placed in tray!"
    );

}
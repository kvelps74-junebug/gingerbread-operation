// ===================================
// GINGERBREAD OPERATION
// PROTOTYPE GAME SCRIPT
// ===================================


// ===================================
// MAIN ELEMENTS
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

const gingerbreadWrapper =
    document.getElementById("gingerbread-wrapper");

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

const gingerbreadMouth =
    document.getElementById("gingerbread-mouth");

const bakingObjects =
    document.querySelectorAll(".baking-object");


// ===================================
// DIFFICULTY SETTINGS
// ===================================
//
// Smaller tolerance = less sideways
// movement allowed.
//
// Larger liftDistance = farther the
// object must travel straight upward.
// ===================================

const difficultyOverrides = {

    // Present must come almost
    // perfectly straight upward.

    "Present": {
        liftDistance: 72,
        tolerance: 7
    },


    // Rolling pin requires a longer,
    // relatively straight extraction.

    "Rolling Pin": {
        liftDistance: 58,
        tolerance: 16
    },


    // Whisk is intentionally difficult.

    "Whisk": {
        liftDistance: 70,
        tolerance: 14
    }

};


// ===================================
// GAME ITEM DATA
// ===================================

const gameItems =
    Array.from(bakingObjects).map(
        function (element) {

            const name =
                element.dataset.name;


            const difficulty =
                difficultyOverrides[name];


            const artwork =
                element.querySelector(
                    ".object-art"
                );


            if (artwork) {

                artwork.draggable =
                    false;

            }


            return {

                element:
                    element,

                artwork:
                    artwork,

                name:
                    name,

                liftDistance:
                    difficulty
                        ? difficulty.liftDistance
                        : Number(
                            element.dataset.lift
                        ),

                tolerance:
                    difficulty
                        ? difficulty.tolerance
                        : Number(
                            element.dataset.tolerance
                        ),

                extracted:
                    false,

                removed:
                    false,

                startingX:
                    null,

                startingY:
                    null,

                dragOffsetX:
                    0,

                dragOffsetY:
                    0

            };

        }
    );


const totalObjects =
    gameItems.length;


// ===================================
// GAME STATE
// ===================================

let tickets =
    10;

let objectsRemoved =
    0;

let isDragging =
    false;

let collisionCooldown =
    false;

let activeItem =
    null;

let gameActive =
    false;


// ===================================
// TICKET EMOJI CURSOR
// ===================================

const ticketCursor =
    document.createElement("div");


ticketCursor.id =
    "ticket-cursor";


ticketCursor.textContent =
    "🎟️";


document.body.appendChild(
    ticketCursor
);


function enableTicketCursor() {

    document.body.classList.add(
        "ticket-cursor-mode"
    );


    ticketCursor.style.display =
        "block";

}


function disableTicketCursor() {

    document.body.classList.remove(
        "ticket-cursor-mode"
    );


    ticketCursor.style.display =
        "none";

}


// ===================================
// ITEM INTERACTION
// ===================================

function setItemInteractive(
    item,
    enabled
) {

    item.element.style.pointerEvents =
        enabled
            ? "auto"
            : "none";


    if (item.artwork) {

        item.artwork.style.pointerEvents =
            enabled
                ? "auto"
                : "none";

    }

}


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


        // -----------------------------------
        // REQUIRED FIELDS
        // -----------------------------------

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


        // -----------------------------------
        // BASIC EMAIL VALIDATION
        // -----------------------------------

        if (
            !workEmail.includes("@") ||
            !workEmail.includes(".")
        ) {

            alert(
                "Please enter a valid work email."
            );

            return;

        }


        // -----------------------------------
        // RESET GAME
        // -----------------------------------

        disableTicketCursor();


        tickets =
            10;


        objectsRemoved =
            0;


        isDragging =
            false;


        collisionCooldown =
            false;


        activeItem =
            null;


        gameActive =
            true;


        ticketCountDisplay.textContent =
            tickets;


        objectsRemovedDisplay.textContent =
            `0 / ${totalObjects}`;


        playerNameDisplay.textContent =
            `Good luck, ${firstName}!`;


        playerSection.style.display =
            "none";


        gameSection.style.display =
            "block";


        tongs.style.display =
            "none";


        tongs.classList.remove(
            "closed"
        );


        gingerbreadNose.classList.remove(
            "buzzing"
        );


        gingerbreadMouth.classList.remove(
            "buzzing"
        );


        // -----------------------------------
        // INITIALIZE OBJECTS
        // -----------------------------------

        requestAnimationFrame(
            function () {

                gameItems.forEach(
                    function (item) {

                        // Store the original
                        // cavity position once.

                        if (
                            item.startingX === null ||
                            item.startingY === null
                        ) {

                            item.startingX =
                                item.element.offsetLeft;


                            item.startingY =
                                item.element.offsetTop;

                        }


                        // Reset position.

                        item.element.style.left =
                            item.startingX +
                            "px";


                        item.element.style.top =
                            item.startingY +
                            "px";


                        item.extracted =
                            false;


                        item.removed =
                            false;


                        item.element.classList.remove(
                            "lifting"
                        );


                        item.element.classList.remove(
                            "extracted"
                        );


                        item.element.classList.remove(
                            "removed-object"
                        );


                        setItemInteractive(
                            item,
                            true
                        );

                    }
                );


                updateTrayState();

            }
        );

    }
);


// ===================================
// DETECT VISIBLE OBJECT IMAGE
// ===================================
//
// This is the important pickup fix.
//
// We no longer depend on the smaller
// .baking-object parent box.
//
// Instead, we check the REAL visible
// image rectangle on the screen.
// ===================================

function getItemAtPointer(
    clientX,
    clientY
) {

    const matchingItems =
        gameItems.filter(
            function (item) {

                if (
                    item.removed ||
                    !item.artwork
                ) {

                    return false;

                }


                const rect =
                    item.artwork
                        .getBoundingClientRect();


                return (
                    clientX >= rect.left &&
                    clientX <= rect.right &&
                    clientY >= rect.top &&
                    clientY <= rect.bottom
                );

            }
        );


    if (
        matchingItems.length === 0
    ) {

        return null;

    }


    // If two images ever overlap,
    // choose the image whose center
    // is closest to the pointer.

    matchingItems.sort(
        function (a, b) {

            const rectA =
                a.artwork
                    .getBoundingClientRect();


            const rectB =
                b.artwork
                    .getBoundingClientRect();


            const centerAX =
                rectA.left +
                rectA.width / 2;


            const centerAY =
                rectA.top +
                rectA.height / 2;


            const centerBX =
                rectB.left +
                rectB.width / 2;


            const centerBY =
                rectB.top +
                rectB.height / 2;


            const distanceA =
                Math.hypot(
                    clientX - centerAX,
                    clientY - centerAY
                );


            const distanceB =
                Math.hypot(
                    clientX - centerBX,
                    clientY - centerBY
                );


            return (
                distanceA -
                distanceB
            );

        }
    );


    return matchingItems[0];

}


// ===================================
// GLOBAL POINTER DOWN
// ===================================
//
// Clicking ANYWHERE inside an
// object's visible image starts drag.
// ===================================

document.addEventListener(
    "pointerdown",
    function (event) {

        if (!gameActive) {

            return;

        }


        if (tickets <= 0) {

            return;

        }


        if (collisionCooldown) {

            return;

        }


        if (isDragging) {

            return;

        }


        const item =
            getItemAtPointer(
                event.clientX,
                event.clientY
            );


        if (!item) {

            return;

        }


        beginDrag(
            event,
            item
        );

    }
);


// ===================================
// BEGIN DRAG
// ===================================

function beginDrag(
    event,
    item
) {

    if (!gameActive) {

        return;

    }


    if (item.removed) {

        return;

    }


    if (tickets <= 0) {

        return;

    }


    if (collisionCooldown) {

        return;

    }


    event.preventDefault();


    const metrics =
        getWrapperMetrics();


    const itemRect =
        item.element
            .getBoundingClientRect();


    // -----------------------------------
    // PRESERVE EXACT PICKUP POINT
    // -----------------------------------

    item.dragOffsetX =
        (
            event.clientX -
            itemRect.left
        ) *
        metrics.scaleX;


    item.dragOffsetY =
        (
            event.clientY -
            itemRect.top
        ) *
        metrics.scaleY;


    isDragging =
        true;


    activeItem =
        item;


    tongs.classList.add(
        "closed"
    );


    if (!item.extracted) {

        item.element.classList.add(
            "lifting"
        );

    }

}


// ===================================
// GLOBAL POINTER MOVE
// ===================================

document.addEventListener(
    "pointermove",
    function (event) {

        // -----------------------------------
        // TICKET CURSOR
        // -----------------------------------

        if (
            document.body.classList.contains(
                "ticket-cursor-mode"
            )
        ) {

            ticketCursor.style.left =
                event.clientX +
                "px";


            ticketCursor.style.top =
                event.clientY +
                "px";

        }


        // -----------------------------------
        // GAME NOT ACTIVE
        // -----------------------------------

        if (!gameActive) {

            tongs.style.display =
                "none";

            return;

        }


        // -----------------------------------
        // MOVE ACTIVE OBJECT
        // -----------------------------------

        if (
            isDragging &&
            activeItem
        ) {

            dragItem(
                event,
                activeItem
            );

        }


        // -----------------------------------
        // MOVE TONGS
        // -----------------------------------

        const boardRect =
            gameBoard
                .getBoundingClientRect();


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


        let tongX =
            event.clientX -
            boardRect.left;


        let tongY =
            event.clientY -
            boardRect.top;


        tongX =
            Math.max(
                0,
                Math.min(
                    tongX,
                    boardRect.width
                )
            );


        tongY =
            Math.max(
                0,
                Math.min(
                    tongY,
                    boardRect.height
                )
            );


        tongs.style.left =
            tongX +
            "px";


        tongs.style.top =
            tongY +
            "px";


        tongs.style.display =
            "block";

    }
);


// ===================================
// WRAPPER COORDINATE HELPERS
// ===================================

function getWrapperMetrics() {

    const wrapperRect =
        gingerbreadWrapper
            .getBoundingClientRect();


    const scaleX =
        gingerbreadWrapper.offsetWidth /
        wrapperRect.width;


    const scaleY =
        gingerbreadWrapper.offsetHeight /
        wrapperRect.height;


    return {

        wrapperRect:
            wrapperRect,

        scaleX:
            scaleX,

        scaleY:
            scaleY

    };

}


// ===================================
// DRAG ITEM
// ===================================

function dragItem(
    event,
    item
) {

    if (
        !isDragging ||
        activeItem !== item
    ) {

        return;

    }


    if (collisionCooldown) {

        return;

    }


    const metrics =
        getWrapperMetrics();


    const wrapperRect =
        metrics.wrapperRect;


    const scaleX =
        metrics.scaleX;


    const scaleY =
        metrics.scaleY;


    const boardRect =
        gameBoard
            .getBoundingClientRect();


    const objectWidth =
        item.element.offsetWidth;


    const objectHeight =
        item.element.offsetHeight;


    // -----------------------------------
    // CONVERT POINTER TO LOCAL POSITION
    // -----------------------------------

    const pointerLocalX =
        (
            event.clientX -
            wrapperRect.left
        ) *
        scaleX;


    const pointerLocalY =
        (
            event.clientY -
            wrapperRect.top
        ) *
        scaleY;


    let newX =
        pointerLocalX -
        item.dragOffsetX;


    let newY =
        pointerLocalY -
        item.dragOffsetY;


    // ===================================
    // EXTRACTION MECHANIC
    // ===================================

    if (!item.extracted) {

        const liftProgress =
            item.startingY -
            newY;


        const sidewaysDrift =
            Math.abs(
                newX -
                item.startingX
            );


        const downwardMovement =
            newY -
            item.startingY;


        // -----------------------------------
        // SIDE COLLISION
        // -----------------------------------

        if (
            sidewaysDrift >
                item.tolerance &&
            liftProgress <
                item.liftDistance
        ) {

            triggerCollision(
                item
            );

            return;

        }


        // -----------------------------------
        // DOWNWARD COLLISION
        // -----------------------------------

        if (
            downwardMovement >
            14
        ) {

            triggerCollision(
                item
            );

            return;

        }


        // -----------------------------------
        // SAFE EXTRACTION
        // -----------------------------------

        if (
            liftProgress >=
            item.liftDistance
        ) {

            item.extracted =
                true;


            item.element.classList.remove(
                "lifting"
            );


            item.element.classList.add(
                "extracted"
            );


            updateTrayState(
                item
            );

        }

    }


    // ===================================
    // KEEP ITEM INSIDE GAME BOARD
    // ===================================

    const minX =
        (
            boardRect.left -
            wrapperRect.left
        ) *
        scaleX;


    const maxX =
        (
            boardRect.right -
            wrapperRect.left
        ) *
        scaleX -
        objectWidth;


    const minY =
        (
            boardRect.top -
            wrapperRect.top
        ) *
        scaleY;


    const maxY =
        (
            boardRect.bottom -
            wrapperRect.top
        ) *
        scaleY -
        objectHeight;


    newX =
        Math.max(
            minX,
            Math.min(
                newX,
                maxX
            )
        );


    newY =
        Math.max(
            minY,
            Math.min(
                newY,
                maxY
            )
        );


    item.element.style.left =
        newX +
        "px";


    item.element.style.top =
        newY +
        "px";

}


// ===================================
// GLOBAL RELEASE
// ===================================

document.addEventListener(
    "pointerup",
    function (event) {

        if (
            !isDragging ||
            !activeItem
        ) {

            return;

        }


        releaseItem(
            event,
            activeItem
        );

    }
);


// ===================================
// POINTER CANCEL
// ===================================

document.addEventListener(
    "pointercancel",
    function () {

        if (
            !isDragging ||
            !activeItem
        ) {

            return;

        }


        cancelDrag(
            activeItem
        );

    }
);


// ===================================
// RELEASE ITEM
// ===================================

function releaseItem(
    event,
    item
) {

    if (
        !isDragging ||
        activeItem !== item
    ) {

        return;

    }


    isDragging =
        false;


    activeItem =
        null;


    tongs.classList.remove(
        "closed"
    );


    item.element.classList.remove(
        "lifting"
    );


    // ===================================
    // RELEASED BEFORE FULL EXTRACTION
    // ===================================

    if (!item.extracted) {

        returnItemToStart(
            item
        );


        updateTrayState();


        return;

    }


    // ===================================
    // CHECK TRAY DROP
    // ===================================

    const itemRect =
        item.element
            .getBoundingClientRect();


    const trayRect =
        dropZone
            .getBoundingClientRect();


    const itemCenterX =
        itemRect.left +
        itemRect.width / 2;


    const itemCenterY =
        itemRect.top +
        itemRect.height / 2;


    const droppedInTray =
        itemCenterX >=
            trayRect.left &&
        itemCenterX <=
            trayRect.right &&
        itemCenterY >=
            trayRect.top &&
        itemCenterY <=
            trayRect.bottom;


    if (droppedInTray) {

        completeItem(
            item
        );

        return;

    }


    // Item has cleared cavity,
    // so it can remain loose until
    // player moves it to the tray.

    updateTrayState(
        item
    );

}


// ===================================
// CANCEL DRAG
// ===================================

function cancelDrag(
    item
) {

    if (
        activeItem !== item
    ) {

        return;

    }


    isDragging =
        false;


    activeItem =
        null;


    tongs.classList.remove(
        "closed"
    );


    item.element.classList.remove(
        "lifting"
    );


    if (!item.extracted) {

        returnItemToStart(
            item
        );

    }


    updateTrayState();

}


// ===================================
// RETURN ITEM TO CAVITY
// ===================================

function returnItemToStart(
    item
) {

    item.extracted =
        false;


    item.element.style.left =
        item.startingX +
        "px";


    item.element.style.top =
        item.startingY +
        "px";


    item.element.classList.remove(
        "lifting"
    );


    item.element.classList.remove(
        "extracted"
    );

}


// ===================================
// BUZZ SOUND
// ===================================

function playBuzz() {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


    if (!AudioContext) {

        return;

    }


    const audioContext =
        new AudioContext();


    const oscillator =
        audioContext
            .createOscillator();


    const gainNode =
        audioContext
            .createGain();


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


    oscillator.addEventListener(
        "ended",
        function () {

            audioContext.close();

        }
    );

}


// ===================================
// COLLISION / BUZZ
// ===================================

function triggerCollision(
    item
) {

    if (collisionCooldown) {

        return;

    }


    collisionCooldown =
        true;


    isDragging =
        false;


    activeItem =
        null;


    item.extracted =
        false;


    // -----------------------------------
    // LOSE ONE TICKET
    // -----------------------------------

    tickets--;


    if (tickets < 0) {

        tickets =
            0;

    }


    ticketCountDisplay.textContent =
        tickets;


    // -----------------------------------
    // FACE REACTION
    // -----------------------------------

    gingerbreadNose.classList.add(
        "buzzing"
    );


    gingerbreadMouth.classList.add(
        "buzzing"
    );


    // -----------------------------------
    // SOUND
    // -----------------------------------

    playBuzz();


    // -----------------------------------
    // OPEN TONGS
    // -----------------------------------

    tongs.classList.remove(
        "closed"
    );


    // -----------------------------------
    // RESET OBJECT
    // -----------------------------------

    returnItemToStart(
        item
    );


    updateTrayState();


    // -----------------------------------
    // RESET FACE
    // -----------------------------------

    setTimeout(
        function () {

            gingerbreadNose.classList.remove(
                "buzzing"
            );


            gingerbreadMouth.classList.remove(
                "buzzing"
            );

        },
        500
    );


    // -----------------------------------
    // COLLISION COOLDOWN
    // -----------------------------------

    setTimeout(
        function () {

            collisionCooldown =
                false;

        },
        750
    );


    if (tickets <= 0) {

        gameOver();

    }

}


// ===================================
// COMPLETE ITEM
// ===================================

function completeItem(
    item
) {

    if (item.removed) {

        return;

    }


    item.removed =
        true;


    item.extracted =
        false;


    objectsRemoved++;


    objectsRemovedDisplay.textContent =
        `${objectsRemoved} / ${totalObjects}`;


    item.element.classList.remove(
        "extracted"
    );


    item.element.classList.add(
        "removed-object"
    );


    snapItemToTray(
        item,
        objectsRemoved - 1
    );


    setItemInteractive(
        item,
        false
    );


    updateTrayState();


    if (
        objectsRemoved ===
        totalObjects
    ) {

        handleWin();

    }

}


// ===================================
// SNAP ITEM TO TRAY
// ===================================

function snapItemToTray(
    item,
    completedIndex
) {

    const metrics =
        getWrapperMetrics();


    const wrapperRect =
        metrics.wrapperRect;


    const scaleX =
        metrics.scaleX;


    const scaleY =
        metrics.scaleY;


    const trayRect =
        dropZone
            .getBoundingClientRect();


    const objectWidth =
        item.element.offsetWidth;


    const objectHeight =
        item.element.offsetHeight;


    const traySlots = [

        {
            x: 0.28,
            y: 0.29
        },

        {
            x: 0.72,
            y: 0.29
        },

        {
            x: 0.28,
            y: 0.51
        },

        {
            x: 0.72,
            y: 0.51
        },

        {
            x: 0.50,
            y: 0.72
        }

    ];


    const slot =
        traySlots[
            Math.min(
                completedIndex,
                traySlots.length - 1
            )
        ];


    const trayClientX =
        trayRect.left +
        trayRect.width *
        slot.x;


    const trayClientY =
        trayRect.top +
        trayRect.height *
        slot.y;


    const localX =
        (
            trayClientX -
            wrapperRect.left
        ) *
        scaleX -
        objectWidth / 2;


    const localY =
        (
            trayClientY -
            wrapperRect.top
        ) *
        scaleY -
        objectHeight / 2;


    item.element.style.left =
        localX +
        "px";


    item.element.style.top =
        localY +
        "px";

}


// ===================================
// UPDATE TRAY MESSAGE
// ===================================

function updateTrayState(
    preferredItem = null
) {

    const trayMessage =
        dropZone.querySelector(
            "p"
        );


    let extractedItem =
        preferredItem;


    if (
        !extractedItem ||
        !extractedItem.extracted ||
        extractedItem.removed
    ) {

        extractedItem =
            gameItems.find(
                function (item) {

                    return (
                        item.extracted &&
                        !item.removed
                    );

                }
            );

    }


    dropZone.classList.toggle(
        "ready",
        Boolean(
            extractedItem
        )
    );


    if (extractedItem) {

        trayMessage.textContent =
            `Safe extraction! Place the ${extractedItem.name} on the tray.`;

        return;

    }


    if (
        objectsRemoved ===
        totalObjects
    ) {

        trayMessage.textContent =
            `✓ All ${totalObjects} items removed!`;

        return;

    }


    if (objectsRemoved > 0) {

        trayMessage.textContent =
            `✓ ${objectsRemoved} of ${totalObjects} items safely removed.`;

        return;

    }


    trayMessage.textContent =
        "Safely extract an item first.";

}


// ===================================
// GAME OVER
// ===================================

function gameOver() {

    gameActive =
        false;


    isDragging =
        false;


    activeItem =
        null;


    tongs.style.display =
        "none";


    tongs.classList.remove(
        "closed"
    );


    gameItems.forEach(
        function (item) {

            setItemInteractive(
                item,
                false
            );

        }
    );


    enableTicketCursor();


    setTimeout(
        function () {

            alert(
                "Game Over!\n\nYou ran out of gameplay tickets.\n\n🎟️ You still earned 1 prize ticket just for playing!"
            );

        },
        300
    );

}


// ===================================
// WIN
// ===================================

function handleWin() {

    gameActive =
        false;


    isDragging =
        false;


    activeItem =
        null;


    tongs.style.display =
        "none";


    tongs.classList.remove(
        "closed"
    );


    gameItems.forEach(
        function (item) {

            setItemInteractive(
                item,
                false
            );

        }
    );


    enableTicketCursor();


    const earnedTickets =
        Math.max(
            tickets,
            1
        );


    setTimeout(
        function () {

            alert(
                `You removed all ${totalObjects} items!\n\n🎉 Great job!\n🎟️ Prize Tickets Earned: ${earnedTickets}`
            );

        },
        300
    );

}
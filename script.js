// ===================================
// MAIN ELEMENTS
// ===================================

const startButton =
    document.getElementById(
        "start-button"
    );


const playerSection =
    document.getElementById(
        "player-section"
    );


const gameSection =
    document.getElementById(
        "game-section"
    );


const firstNameInput =
    document.getElementById(
        "first-name"
    );


const lastNameInput =
    document.getElementById(
        "last-name"
    );


const workEmailInput =
    document.getElementById(
        "work-email"
    );


const playerNameDisplay =
    document.getElementById(
        "player-name-display"
    );


const gameBoard =
    document.getElementById(
        "game-board"
    );


const gingerbreadWrapper =
    document.getElementById(
        "gingerbread-wrapper"
    );


const dropZone =
    document.getElementById(
        "drop-zone"
    );


const tongs =
    document.getElementById(
        "tongs"
    );


const ticketCountDisplay =
    document.getElementById(
        "ticket-count"
    );


const objectsRemovedDisplay =
    document.getElementById(
        "objects-removed-count"
    );


const gingerbreadNose =
    document.getElementById(
        "gingerbread-nose"
    );


const gingerbreadMouth =
    document.getElementById(
        "gingerbread-mouth"
    );


const bakingObjects =
    document.querySelectorAll(
        ".baking-object"
    );



// ===================================
// GAME ITEMS
// ===================================

const gameItems =
    Array.from(
        bakingObjects
    ).map(

        function (element) {

            return {

                element:
                    element,

                name:
                    element.dataset.name,

                liftDistance:
                    Number(
                        element.dataset.lift
                    ),

                tolerance:
                    Number(
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


let activePointerId =
    null;


let gameActive =
    false;



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


        activePointerId =
            null;


        gameActive =
            true;



        ticketCountDisplay.textContent =
            tickets;


        objectsRemovedDisplay.textContent =
            `${objectsRemoved} / ${totalObjects}`;


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



        requestAnimationFrame(

            function () {

                gameItems.forEach(

                    function (item) {


                        item.startingX =
                            item.element.offsetLeft;


                        item.startingY =
                            item.element.offsetTop;


                        item.extracted =
                            false;


                        item.removed =
                            false;


                        item.element.style.pointerEvents =
                            "auto";


                        item.element.classList.remove(
                            "lifting"
                        );


                        item.element.classList.remove(
                            "extracted"
                        );


                        item.element.classList.remove(
                            "removed-object"
                        );

                    }

                );


                updateTrayState();

            }

        );

    }

);



// ===================================
// TONG MOVEMENT
// ===================================

document.addEventListener(

    "pointermove",

    function (event) {


        if (!gameActive) {

            tongs.style.display =
                "none";

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
            tongX + "px";


        tongs.style.top =
            tongY + "px";


        tongs.style.display =
            "block";

    }

);



// ===================================
// OBJECT EVENTS
// ===================================

gameItems.forEach(

    function (item) {


        item.element.addEventListener(

            "pointerdown",

            function (event) {

                beginDrag(
                    event,
                    item
                );

            }

        );



        item.element.addEventListener(

            "pointermove",

            function (event) {

                dragItem(
                    event,
                    item
                );

            }

        );



        item.element.addEventListener(

            "pointerup",

            function (event) {

                releaseItem(
                    event,
                    item
                );

            }

        );



        item.element.addEventListener(

            "pointercancel",

            function (event) {

                cancelDrag(
                    event,
                    item
                );

            }

        );

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



    // Preserve exactly where the
    // player grabbed the object.
    // This prevents the item jumping
    // to the center of the mouse.

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


    activePointerId =
        event.pointerId;



    item.element.setPointerCapture(
        event.pointerId
    );



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
        gameBoard.getBoundingClientRect();



    const objectWidth =
        item.element.offsetWidth;


    const objectHeight =
        item.element.offsetHeight;



    // ===================================
    // CONVERT MOUSE POSITION INTO
    // GINGERBREAD WRAPPER COORDINATES
    // ===================================

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
        // THE ITEM MUST BE LIFTED UPWARD
        // WHILE STAYING MOSTLY CENTERED.
        //
        // This creates a real path OUT
        // of every cavity.
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



        // Moving noticeably downward
        // while still inside the cavity
        // also counts as touching the edge.

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



    // ===================================
    // MOVE OBJECT
    // ===================================

    item.element.style.left =
        newX + "px";


    item.element.style.top =
        newY + "px";

}



// ===================================
// RELEASE ITEM
// ===================================

function releaseItem(
    event,
    item
) {


    if (
        activeItem !== item ||
        !isDragging
    ) {

        return;

    }



    isDragging =
        false;


    tongs.classList.remove(
        "closed"
    );


    item.element.classList.remove(
        "lifting"
    );



    if (
        item.element.hasPointerCapture(
            event.pointerId
        )
    ) {

        item.element.releasePointerCapture(
            event.pointerId
        );

    }



    activePointerId =
        null;


    activeItem =
        null;



    // ===================================
    // NOT FULLY EXTRACTED YET
    // ===================================

    if (!item.extracted) {


        // No ticket loss for simply
        // letting go too early.

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



    // The object stays safely extracted
    // if released somewhere else.
    // The player can grab it again
    // and carry it to the tray.

    updateTrayState(
        item
    );

}



// ===================================
// CANCEL DRAG
// ===================================

function cancelDrag(
    event,
    item
) {


    if (activeItem !== item) {

        return;

    }



    isDragging =
        false;


    tongs.classList.remove(
        "closed"
    );


    item.element.classList.remove(
        "lifting"
    );



    if (
        item.element.hasPointerCapture(
            event.pointerId
        )
    ) {

        item.element.releasePointerCapture(
            event.pointerId
        );

    }



    activePointerId =
        null;


    activeItem =
        null;



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


    item.extracted =
        false;



    if (
        activePointerId !== null &&
        item.element.hasPointerCapture(
            activePointerId
        )
    ) {

        item.element.releasePointerCapture(
            activePointerId
        );

    }



    activePointerId =
        null;


    activeItem =
        null;



    // ===================================
    // LOSE ONE GAMEPLAY TICKET
    // ===================================

    tickets--;


    if (tickets < 0) {

        tickets =
            0;

    }


    ticketCountDisplay.textContent =
        tickets;



    // ===================================
    // FACE REACTION
    // ===================================

    gingerbreadNose.classList.add(
        "buzzing"
    );


    gingerbreadMouth.classList.add(
        "buzzing"
    );



    // ===================================
    // SOUND
    // ===================================

    playBuzz();



    // ===================================
    // OPEN TONGS
    // ===================================

    tongs.classList.remove(
        "closed"
    );



    // ===================================
    // RESET ITEM
    // ===================================

    returnItemToStart(
        item
    );


    updateTrayState();



    // ===================================
    // STOP FACE REACTION
    // ===================================

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



    // ===================================
    // COLLISION COOLDOWN
    // ===================================

    setTimeout(

        function () {

            collisionCooldown =
                false;

        },

        750

    );



    // ===================================
    // GAME OVER
    // ===================================

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



    item.element.style.pointerEvents =
        "none";



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
// UPDATE TRAY
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


    tongs.style.display =
        "none";



    gameItems.forEach(

        function (item) {

            item.element.style.pointerEvents =
                "none";

        }

    );



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


    tongs.style.display =
        "none";



    gameItems.forEach(

        function (item) {

            item.element.style.pointerEvents =
                "none";

        }

    );



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
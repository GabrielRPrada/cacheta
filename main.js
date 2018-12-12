const suits = [ "clubs", "diamonds", "spades", "hearts" ];
const ptSuits = [ "paus", "ouros", "espadas", "copas"];

let discard;
let deck;
let wildcard;
let wildcardList;
let players;

let gameId;

let wildcardStyle;

let aiDifficultySelected;

let gameWon;

let start;

function getCard(number) {
    if (number > 103) {
        return {
            suit: "joker",
            rankValue: 0,
            toString: () => "joker",
            toPrettyString: () => "coringa"
        };
    }

    const cardNumber = number > 51 ? number - 52 : number;

    let card = {};
    card.suit = suits[Math.floor(cardNumber / 13)];

    card.rankValue = (cardNumber % 13) + 1;

    card.toString = function() {
        return `${this.suit}${getRankString(this.rankValue)}`; 
    };

    card.toPrettyString = function() {
        return `${getRankString(this.rankValue, true)} de ${ptSuits[suits.indexOf(this.suit)]}`;
    };

    return card;
}

function getRankString(rankValue, local = false) {
    switch (rankValue) {
        case 1:
            return local ? "ás" : "a";
        case 11:
            return local ? "valete" : "j";
        case 12:
            return local ? "rainha" :"q";
        case 13: 
            return local ? "rei" : "k";
        default:
            return rankValue;
    }
}

function shuffle(deck) {
    let cards = deck.slice()
    for (let n = 0; n < cards.length; n += 1) {
        let random = Math.floor(Math.random() * (n + 1));
        let swap = cards[random];
        cards[random] = cards[n];
        cards[n] = swap;
    }

    return cards;
}

function alert(string = "") {
    document.getElementById("alert").innerHTML = string;
}

function announce(string = "") {
    document.getElementById("announce").innerText = string;
}

function resetTable(id, endTurn = false) {
    if (id === gameId) {
        let stock = document.querySelector(".stock");
        stock.src = "cards/back.png";
        stock.alt = "back of card";
        stock.title = "";
        stock.removeAttribute("id");
        stock.onclick = undefined;

        document.getElementById("discarding").onclick = undefined;

        if (endTurn && players[0].chirped) {
            document.getElementById("hit").disabled = true;
        }

        let winner = document.getElementsByClassName("winner");
        for (let element of winner) {
            element.classList.remove("winner");
        }
        
        removeGlow();

        let playerCards = document.querySelectorAll("#player .card");
        for (let element of playerCards) {
            element.onclick = undefined;
        }
        players[0].drawCards();
    }
}

function removeGlow() {
    while (document.querySelector(".glow")) {
        document.querySelector(".glow").classList.remove("glow", "glow-buy", "glow-discard");
    }
}

class Player {
    constructor(name, side) {
        this.hand = deck.splice(0, 9);
        this.name = name;
        this.side = side;
        this.uninterestedCards = [];
        this.interestedCards = [];
        this.gameId = gameId;

        this.organizeCards();
        this.initializeCards();
    }

    checkWin() {
        let possibleHand = this.hand.slice();
        if (!this.chirped && this.hand.length < 10) {
            possibleHand.push(discard);
        }
        let games = checkGames(possibleHand, discard).games;
        if (games.length >= 3) {
            return true;
        }
        return false;
    }

    chirp() {
        this.chirped = true;
        alert("Você não tem jogos o suficiente. Você piou!");
    }

    initializeCards() {
        let hand = document.getElementById(`${this.name}-hand`);

        hand.innerHTML = "";

        for (let i = 0; i < this.hand.length; i += 1) {
            let img = document.createElement("img");
            img.classList.add("card");

            img.id = `player-card-${i}`;

            let cardInfo = getCard(this.hand[i]);
            img.src =`cards/${cardInfo}.png`;
            img.alt = cardInfo.toPrettyString();
            img.title = cardInfo.toPrettyString();

            document.getElementById(`${this.name}-hand`).appendChild(img);
        }
    }

    drawCards() {
        this.organizeCards();
        let stock = document.querySelector(".stock");
        if (this.hand.length === 10 && stock.id !== `${this.name}-card-9`) {
            stock.id = `${this.name}-card-9`;
        }
        for (let card in this.hand) {
            let cardElement = document.getElementById(`${this.name}-card-${card}`);
            let cardInfo = getCard(this.hand[card]);
            cardElement.src = `cards/${cardInfo}.png`;
            cardElement.alt = cardInfo.toPrettyString();
            cardElement.title = cardInfo.toPrettyString();
        }
    }

    organizeCards() {
        let hand = this.hand.slice();
        let tail = hand.splice(9);
        let final = checkGames(hand);
        let games = final.games;
        let partialGamesOrganize = [];
    
        if (final.partialGames.length) {
            for (let partial of final.partialGames) {
                for (let card of partial) {
                    if (!games.some((game) => game.includes(card)) &&
                        !partialGamesOrganize.some((c) => c === card)) {
                        partialGamesOrganize.push(card);
                    }
                }
            }
        }
        
        let organized = [].concat(...games);
        if (partialGamesOrganize.length) {
            organized.push(...partialGamesOrganize);
        }
        organized.push(...final.uselessCards);
        organized = [].concat(...organized, tail).map(x => Number(x));

        this.hand = organized;
    }

    move() {
        return new Promise((resolve, reject) => {
            if (this.gameId === gameId) {
                if (gameWon) {
                    reject(gameWon);
                }

                if (this.chirped) {
                    document.getElementById("hit").disabled = false;
                }
                
                if (typeof discard === "undefined" || isWildcard(discard)) {
                    alert("É o seu turno. Pegue uma carta do monte.");
                }

                else {
                    if (this.chirped) {
                        alert("É o seu turno. Você piou, então só pode pegar uma carta do monte.")
                    }
                    else {
                        alert("É o seu turno. Escolha se quer pegar uma carta do monte ou a do descarte.");
                    }
                }

                let stock = document.querySelector(".stock");
                stock.onclick = function() { this.takeFromStock(resolve) }.bind(this);

                if (this.name === "player") {
                    stock.classList.add("glow", "glow-buy");
                }

                if (typeof discard !== "undefined" && !this.chirped && !isWildcard(discard)) {
                    document.getElementById("discarding").onclick = function() { this.takeFromDiscarding(resolve) }.bind(this);
                    document.getElementById("discard-top").classList.add("glow", "glow-buy");
                }
            }
        });
    }

    discard(source, callback, discardedCard = "") {
        if (this.gameId === gameId) {
            for (let i = 0; i < this.hand.length; i += 1) {
                let card = document.getElementById(`player-card-${i}`);
                card.onclick = function() { this.throwAway(i, callback, source, discardedCard) }.bind(this);
                card.classList.add("glow", "glow-discard");
            }
            alert("Escolha a carta que deseja descartar.");
        }
    }

    takeFromStock(callback) {
        resetTable(this.gameId);
        if (this.gameId === gameId) {
            let card = this.buy();
            if (this.name === "player") {
                let stock = document.querySelector(".stock");
                let stockInfo = getCard(card);
                stock.src = `cards/${stockInfo}.png`;
                stock.alt = stockInfo.toPrettyString();
                stock.title = stockInfo.toPrettyString();
                stock.id = `player-card-9`;
            }
            if (typeof discard !== "undefined") {
                this.uninterested(discard);
            }
            this.discard("from stock", () => {
                resetTable(this.gameId, true);
                callback((this.side + 1) % players.length);
            });
        }
    }

    buy() {
        if (this.gameId === gameId) {
            let cardBought = deck.pop();
            this.hand.push(cardBought);
            return cardBought;
        }
    }

    takeFromDiscarding(callback) {
        resetTable(this.gameId);
        if (this.gameId === gameId) {
            let discarded = discard;
            let discardCards = document.getElementById("discarding");
            discardCards.removeChild(discardCards.lastChild);
            this.discard("discard", () => {
                this.hand.push(discarded);
                this.interested(discarded);
                resetTable(this.gameId);
                callback((this.side + 1) % players.length);
            }, discarded);
        }
    }

    calculateAngle() {
        let angle = Math.floor(Math.random() * 60);
        return angle - 30 + this.side * 90; 
    }

    throwAway(i, callback, source, boughtCard) {
        if (this.gameId === gameId) {
            let card = this.hand.splice(i, 1)[0];
            discard = card;

            let top = document.getElementById("discard-top");
            if (top) {
                top.removeAttribute("id");
            }
            let newTop = document.createElement("img");
            newTop.id = "discard-top";
            newTop.classList.add("card");
            newTop.style.transform = `rotate(${this.calculateAngle()}deg)`;

            let discardInfo = getCard(discard);

            newTop.src = `cards/${discardInfo}.png`;
            newTop.alt = discardInfo.toPrettyString();
            newTop.title = discardInfo.toPrettyString();

            let leftPosition = Math.random() - 0.69;
            let topPosition = Math.random() - 0.69;

            newTop.style.marginLeft = `${leftPosition}em`;
            newTop.style.marginTop = `${topPosition}em`;

            document.getElementById("discarding").appendChild(newTop);

            limitDiscardDisplay();

            this.uninterested(i);

            let name = this.name.toUpperCase();
            let localName = name === "PLAYER" ? "Você" : name;
            if (source === "discard") {
                announce(`${localName} comprou ${getCard(boughtCard).toPrettyString()} do descarte e descartou ${getCard(discard).toPrettyString()}!`)
            }
            else {
                announce(`${localName} comprou do estoque e descartou ${getCard(discard).toPrettyString()}!`)
            }

            callback();
        }
    }
    
    uninterested(i) {
        if (isNaN(i) || i < 0 || this.uninterestedCards.includes(i)) {
            return;
        }
        if (this.uninterestedCards.length > 7) {
            this.uninterestedCards.unshift();
        }
        let cardNumber = i % 52;
        this.uninterestedCards.push(cardNumber);
        let interest = this.interestedCards.indexOf(cardNumber);
        if (interest !== -1) {
            this.interestedCards.splice(interest, 1);
        }
    }

    interested(i) {
        if (isNaN(i) || i < 0 || this.interestedCards.includes(i)) {
            return;
        }
        if (this.interestedCards.length > 5) {
            this.interestedCards.shift();
        }
        let cardNumber = i % 52;
        this.interestedCards.push(cardNumber);
        let uninterest = this.uninterestedCards.indexOf(cardNumber);
        if (uninterest !== -1) {
            this.uninterestedCards.splice(uninterest, 1);
        }
    }

    win(checkTurn) {
       if (typeof turn !== undefined && checkTurn !== turn) {
           return;
       }
        if (gameWon) {
            return gameWon;
        }
        if (this.checkWin()) {
            return this.name;
        }
    
        return;
    }
}

function difficulty() {
    return (10 - aiDifficultySelected);
}

function difficultyPerCent() {
    return (difficulty() / 2) * 10;
}

function difficultyRng(divide) {
    return Math.floor(Math.random() * (difficulty() / divide) * 10);
}

class AI extends Player {
    initializeCards() {
        let hand = document.getElementById(`${this.name}-hand`);

        hand.innerHTML = "";

        for (let i = 0; i < this.hand.length; i += 1) {
            let img = document.createElement("img");
            img.classList.add("card");
            img.id = `${this.name}-card-${i}`;

            img.src = "cards/back.png";

            document.getElementById(`${this.name}-hand`).appendChild(img);
        }
    }

    move() {
        return new Promise((resolve, reject) => {
            if (this.gameId === gameId) {
                alert();

                setTimeout(() => {
                    if (gameWon) {
                        reject(gameWon);
                    }
                    let canBuyFromDiscarded = typeof discard !== "undefined" && !isWildcard(discard);
                    let shouldBuyFromDiscarded = 0;
            
                    if (canBuyFromDiscarded) {
                        let currentGames = checkGames(this.hand);
                        let possibleHand = this.hand.slice();
                        possibleHand.push(discard);
                        let possibleGames = checkGames(this.hand, discard);
                        if (possibleGames.games > currentGames.games ||
                            (possibleGames.games === currentGames.games &&
                                possibleGames.partialGames > currentGames.partialGames)) {
                                shouldBuyFromDiscarded = 100;
                        }            
                    }
            
                    if (shouldBuyFromDiscarded === 0) {
                        shouldBuyFromDiscarded += difficultyPerCent();
                    }
                    else {
                        shouldBuyFromDiscarded -= difficultyPerCent();
                    }
                    
                    let rng = Math.random() * 100;
            
                    if (canBuyFromDiscarded && rng < shouldBuyFromDiscarded) {
                        this.takeFromDiscarding(resolve);
                    }
                    else {
                        this.takeFromStock(resolve);
                    }
                }, 5000);
            }
        });
    }

    discard(source, callback, card = "") {
        if (this.gameId === gameId) {
            let handInfo = checkGames(this.hand);
            let hand = this.hand.slice().map((x) => [x, 100]);

            const nextPlayer = players[(this.side + 1) % players.length];

            for (let card of hand) {
                if (nextPlayer.uninterestedCards.includes(card[0] % 52)) {
                    card[1] += 25 - difficultyRng(4);
                }

                if (nextPlayer.interestedCards
                    .map(card => relatedCards(card))
                    .some(cards => cards.includes(card[0] % 52))) {
                    card[1] -= 50 + difficultyRng(2);
                }

                if (isWildcard(card[0])) {
                    card[1] -= 50 + difficultyRng(2);
                }

                if (handInfo.games.some((game) => game.includes(card[0]))) {
                    card[1] -= 50 + difficultyRng(2);
                }

                if (handInfo.games.some((game) => game.includes(card[0]))) {
                    card[1] -= 25 + difficultyRng(4);
                }

            }

            hand.sort((a, b) => b[1] - a[1]);

            let discard = hand[0][0];

            this.throwAway(this.hand.indexOf(discard), callback, source, card);
        }
    }
}

function limitDiscardDisplay() {
    let discard = document.getElementById("discarding");
    while (discard.childNodes.length > 10) {
        discard.removeChild(discard.firstChild);
    }
}

function generateWildcards() {
    if (wildcardStyle === "separate") {
        return [ 104, 105, 106, 107 ];
    }

    let partialWildcards = [];
    let wildcardNumber = ((wildcard + 1) % 13 !== 0) ? 
        (wildcard % 52) + 1 : (wildcard % 52) - 12;
    let suit = 0;
    while (wildcardNumber > 12) {
        wildcardNumber -= 13;
        suit += 1;
    }

    if (wildcardStyle === "suit") {
        wildcardNumber += suit * 13;
        partialWildcards.push(wildcardNumber);
    }

    if (wildcardStyle === "color") {
        for (let i = 0; i < 52; i += 1) { 
            let sameColor = (Math.floor(i / 13) - suit) % 2 === 0;
            if (i % 13 === wildcardNumber && sameColor) {
                partialWildcards.push(i);
            }
            continue;
        }
    }

    return partialWildcards;
}

function isWildcard(card) {
    let cardInfo = getCard(card);
    if (cardInfo.toString() === "joker") {
        return true;
    }

    let inList = typeof wildcardList !== "undefined" && wildcardList.includes(card % 52);

    return inList;
}


function relatedCards(playerCard) {
    let card = playerCard % 52;

    let partialRelated = [];

    let rank = card % 13 - 2;
    let newCard = card - 2;

    if (rank < 0) {
        rank += 13;
        newCard += 13;
    }

    for (let i = 0; i < 6; i += 1) {
        if (newCard !== card) {
            partialRelated.push(newCard);
        }

        rank += 1;
        newCard += 1;

        if (rank > 12) {
            rank -= 13;
            newCard -= 13;
        }
    }

    newCard = card;
    
    while (newCard > 13) {
        newCard -= 13;
    }

    for (let i = newCard; i < 52; i += 13) {
        if (i !== card) {
            partialRelated.push(i);
        }
    }

    return partialRelated;
}

function checkGames(playerHand, excludeWildcard = -1) {
    let games = [];
    let partialGames = [];
    let wishlist = [];

    let wildcards = [];

    let hand = playerHand.slice();
    hand.sort((a,b) => getCard(a).rankValue - getCard(b).rankValue);

    let wrapCards = 0;

    for (let i = 0; i < hand.length; i += 1) {
        let cardNumber = hand[i] < 104 ? hand[i] % 52 : hand[i];
        let cardIsWildcard = isWildcard(cardNumber);
        if (cardIsWildcard && excludeWildcard !== hand[i]) {
            wildcards.push(hand[i]);
            continue;
        }

        let firstCard = getCard(hand[i]);

        if (firstCard.rankValue < 3) {
            wrapCards += 1;
        }

        for (let j = i + 1; j < hand.length + wrapCards; j += 1) {
            let jwrap = j % hand.length;
            if (hand[i] === hand[jwrap] ||
                (isWildcard(hand[jwrap]) && excludeWildcard !== hand[jwrap])) {
                continue;
            }

            let secondCard = getCard(hand[jwrap]);

            // same rank, different suits
            if (firstCard.rankValue === secondCard.rankValue && 
                firstCard.suit !== secondCard.suit) {
                    for (let k = jwrap + 1; k < hand.length + wrapCards; k += 1) {
                        let kwrap = k % hand.length;

                        if (hand[i] === hand[kwrap] ||
                            hand[jwrap] === hand[kwrap] ||
                            (isWildcard(hand[kwrap]) && excludeWildcard !== hand[kwrap])) {
                                continue;
                            }
                        
                        let thirdCard = getCard(hand[kwrap]);

                        if (thirdCard.rankValue === firstCard.rankValue &&
                            thirdCard.suit !== firstCard.suit &&
                            thirdCard.suit !== secondCard.suit) {
                                let combination = [ hand[i], hand[jwrap], hand[kwrap] ];
                                games.push(combination);
                            }
                    }
                    if (!games.some(game => game.includes(hand[i]))) {
                        partialGames.push([ hand[i], hand[jwrap] ]);
                        let possibleMatches = [];
                        let baseValue = hand[i] % 52;
                        while (baseValue - 12 > 0) {
                            baseValue -= 12;
                        }
                        for (let k = baseValue; k < 52 || possibleMatches.length < 3; k += 13) {
                            if (k !== hand[i] && k !== hand[jwrap]) {
                                possibleMatches.push(k);
                            }
                        }

                        wishlist.push(possibleMatches);
                    }
                }
                
                // same suit, sequential ranks
                if (firstCard.suit === secondCard.suit) {
                    if (secondCard.rankValue - firstCard.rankValue === 1 ||
                        (secondCard.rankValue === 1 && firstCard.rankValue === 13)) {
                        for (let k = jwrap + 1; k < hand.length + wrapCards; k += 1) {
                            let kwrap = k % hand.length;

                            if (hand[i] === hand[kwrap] ||
                                hand[jwrap] === hand[kwrap] ||
                                (isWildcard(hand[kwrap]) && excludeWildcard !== hand[kwrap])) {
                                    continue;
                                }
                            
                            let thirdCard = getCard(hand[kwrap]);
                            
                            if (thirdCard.suit === secondCard.suit && 
                                (thirdCard.rankValue - secondCard.rankValue === 1 ||
                                firstCard.rankValue - thirdCard.rankValue === 1 ||
                                thirdCard.rankValue - secondCard.rankValue === -12)) {
                                    let sequence = [ hand[i], hand[jwrap], hand[kwrap] ];
                                    games.push(sequence);
                                }    
                        }

                        if (!games.some(game => game.includes(hand[i]))) {
                            partialGames.push([ hand[i], hand[jwrap] ]);

                            let smallerValue = (firstCard.rankValue - 1 || 13) - 1;
                            let biggerValue = (secondCard.rankValue + 1) % 13;

                            let handBase = (hand[i] % 52)  - (firstCard.rankValue - 1);
                            let smallerIndex = handBase + smallerValue;
                            let biggerIndex = handBase + biggerValue;
                            wishlist.push([smallerIndex, biggerIndex])
                        }
                }
                
                // broken sequence (with 1 missing card in the middle to form a game)
                if (secondCard.rankValue - firstCard.rankValue === 2 ||
                    (secondCard.rankValue === 1 && firstCard.rankValue === 12) ||
                    (secondCard.rankValue === 2 && firstCard.rankValue === 13)) {
                        if (!games.some(game => game.includes(hand[i]))) {
                            partialGames.push([ hand[i], hand[jwrap] ]);
                            if (secondCard.rankValue === 1) {
                                wishlist.push([ (hand[i] % 52) + 1 ]);
                            }
                            else {
                                wishlist.push([ (hand[jwrap] % 52) - 1 ]);
                            }
                        }
                    }
                }
        }
    }

    if (games.length) {
        // filters for the highest amount of games without any repeated cards inbetween
        let gamesCombinations = [];

        for (let game in games) {
            let gamesList = [ games[game] ];

            for (let secondGame in games) {
                if (game !== secondGame &&
                    !gamesList.some((game) => game.some((card) => games[secondGame].includes(card)))) {
                    gamesList.push(games[secondGame]);
                }
            }

            gamesCombinations.push(gamesList);
        }

        games = gamesCombinations.reduce((a,b) => {
            if (b.length > a.length) {
                return b;
            }
            return a;
        });
    }

    if (partialGames.length) {
        // same as above, but for incomplete games
        let gamesCombinations = [];

        partialGames = partialGames.filter((game) => !game.some((card) => games.some((game) => game.includes(card))));

        for (let game in partialGames) {
            let gamesList = [ partialGames[game] ];

            for (let secondGame in partialGames) {
                if (game !== secondGame &&
                    !gamesList.some((game) => 
                        game.some((card) => partialGames[secondGame].includes(card) || games.some((game) => game.includes(card))))) {
                    gamesList.push(partialGames[secondGame]);
                }
            }

            gamesCombinations.push(gamesList);
        }

        if (gamesCombinations.length) {
            partialGames = gamesCombinations.reduce((a,b) => {
                if (b.length > a.length) {
                    return b;
                }
                return a;
            });
        }
    }

    if (wildcards.length) {
        for (let i = 0; i < wildcards.length; i += 1) {
            if (!partialGames[i]) {
                break;
            }
            games.push(partialGames[i].concat([wildcards[i]]));
            partialGames.splice(i, 1);
        }
    }

    let uselessCards = hand.filter(x => (!games.some(game => game.includes(x)) &&
        !partialGames.some(game => game.includes(x))));

    let out = {
        games: games,
        partialGames: partialGames,
        neededCards: wishlist,
        uselessCards: uselessCards,
        wildCards: wildcards
    };

    return out;
}

function resetGame() {
    gameId += 1;
    setupGame();
}

function setupGame(starting = 0) {
    gameWon = undefined;
    discard = undefined;

    alert();
    announce();

    removeGlow();

    wildcardStyle = document.getElementById("wildcard-select").value;

    if (wildcardStyle === "separate") {
        deck = Array.from(Array(108).keys());
        document.getElementById("wildcard").style.display = "none";
        deck = shuffle(deck);
    }
    else {
        deck = Array.from(Array(104).keys());
        deck = shuffle(deck);
        wildcard = deck.pop();

        let wildCardElement = document.getElementById("wildcard");
        let wildCardInfo = getCard(wildcard);
        wildCardElement.style.display = "initial";
        wildCardElement.src = `cards/${wildCardInfo}.png`;
        wildCardElement.alt = wildCardInfo.toPrettyString();
        wildCardElement.title = wildCardInfo.toPrettyString();
    }

    wildcardList = generateWildcards();

    aiDifficultySelected = document.getElementById("cpu-difficulty").selectedIndex;

    for (let element of document.getElementsByClassName("changed")) {
        element.classList.remove("changed");
    }

    players = [];
    players.push(new Player("player", 0), new AI("cpu1", 1), new AI("cpu2", 2), new AI("cpu3", 3));

    document.querySelector(".stock").src = "cards/back.png";

    let discardTop = document.getElementById("discarding");

    while (discardTop.lastChild) {
        discardTop.removeChild(discardTop.lastChild);
    }

    start = starting;
    gameLoop(starting);
}

function timeout(resolve) {
    setTimeout(() => {
        resolve("timeout");
    }, 3000);
}

let turn = 0;

function gameLoop(player) {
    turn += 1;

    const cpu = players.filter(p => p.name.startsWith("cpu"));

    const current = players[player];
    
    Promise.all([
        new Promise((resolve, reject) => {
            const randomOrder = shuffle(Array(cpu.length));
            setTimeout(() => {
                let winner;
                for (let n in randomOrder) {
                    winner = cpu[n].win(turn);
        
                    if (winner) {
                        reject(winner);
                        break;
                    }
                }

                if (!winner) {
                    resolve();
                };
            }, (25 + (difficulty() / 10) + Math.floor(Math.random() * 10)) * 100);
        }),
        current.move(gameLoop, endGame)]).then(
            (values) => gameLoop(values[1]), 
            (winner) => endGame(winner));
}


function endGame(winner) {
    for (let player of players) {
        player.drawCards();
    };

    resetTable(gameId);

    gameId += 1;

    doWin(winner);
}

function doWin(winner) {
    if (typeof winner !== "string") {
        throw winner;
    }

    document.getElementById(`${winner}-hand`).classList.add("winner");

    let button = document.createElement("button");

    button.id = "one-more";
    button.innerText = "Mais uma?";
    button.setAttribute("onclick", `setupGame(${(start + 1) % players.length})`);

    alert(button.outerHTML);

    let name = winner.toUpperCase();
    announce(`${name === "PLAYER" ? "Você" : name} ganhou!`);
}

function hit() {
    if (players[0].checkWin()) {
        endGame(players[0].name);
    }
    else {
        players[0].chirp();
    }
}

window.onload = () => {
    let difficultySelect = document.getElementById("cpu-difficulty");
    difficultySelect.onchange = () => {
        let text = document.getElementById("difficulty-label");
        if (difficultySelect.selectedIndex !== aiDifficultySelected) {
            text.classList.add("changed");
        }
        else {
            text.classList.remove("changed");
        }
    };

    let wildcardSelect = document.getElementById("wildcard-select");
    wildcardSelect.onchange = () => {
        let text = document.getElementById("wildcard-style-text");
        if (wildcardSelect.value !== wildcardStyle) {
            text.classList.add("changed");
        }
        else {
            text.classList.remove("changed");
        }
    };


    gameId = 0;
    setupGame();
};
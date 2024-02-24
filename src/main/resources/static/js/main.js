'use strict';

const disconnectButton = document.querySelector('#logout');
const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');

let stompClient = null;
let username = null;

const toast = async(type, message, timer= 5000) => {
    await Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: timer,
        showCloseButton: true,
        timerProgressBar: true,
        showConfirmButton: false,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    }).fire({
        timer: timer,
        icon: type,
        html: message,
    });
}

const getCurrentTime = () => {
    const today = new Date();
    return `${today.getHours()}:${today.getMinutes()}`;
}

const getAvatarColor = username => {
    let hash = 0;
    const colors = [
        '#2196F3', '#32c787', '#00BCD4', '#ff5652',
        '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
    ];

    for (let i = 0; i < username.length; i++) {
        hash = 31 * hash + username.charCodeAt(i);
    }

    let index = Math.abs(hash % colors.length);

    return colors[index];
}

const connect = e => {
    username = document.querySelector('#name').value.trim();

    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        document.querySelector("#lead-text").textContent = username;

        const socket = new SockJS('/websocket');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    e.preventDefault();
}

const disconnect = e => {
    chatPage.classList.add('hidden');
    usernamePage.classList.remove('hidden');
    stompClient.connect({}, onDisconnected, onError)
}

const onConnected = options => {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.register", {}, JSON.stringify({sender: username, type: 'JOIN'}))
}

const onDisconnected = options => {
    stompClient.send("/app/chat.register", {}, JSON.stringify({sender: username, type: 'LEAVE'}))
}

const onError = async e => {
    await toast('error', 'Unable to connect to WebSocket! Please refresh the page and try again or contact the administrator!');
}

function send(event) {
    let content = messageInput.value.trim();

    if(content && null !== stompClient) {
        stompClient.send("/app/chat.send", {}, JSON.stringify({
            content,
            sender: username,
            type: 'CHAT',
            time: getCurrentTime()
        }));
        messageInput.value = '';
    }
    event.preventDefault();
}

async function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);

    const chatEvent = async (event, type) => {
        await toast(type, event, 2000)
        return `
            <div class="chat-sap">
                <div class="chat-sap-meta"><span>${event}</span></div>
            </div>
        `
    }

    const chatMessage = (message) => `
        <div class="chat ${username === message.sender ? 'is-me' : 'is-you'}">
            <div class="chat-avatar">
                <div class="user-avatar fw-bold" style="background-color: ${getAvatarColor(message.sender)}">
                    <span>${message.sender.charAt(0).toUpperCase()}</span>
                </div>
            </div>
            <div class="chat-content">
                <div class="chat-bubbles">
                    <div class="chat-bubble">
                        <div class="chat-msg" style="max-width: 350px; word-wrap: break-word;">${message.content}</div>
                    </div>
                </div>
                <ul class="chat-meta">
                    <li>${message.sender}</li>
                    <li><time>${message.time}</time></li>
                </ul>
            </div>
        </div>
    `

    console.log(message)

    switch (message.type) {
        case 'JOIN':
            messageArea.innerHTML += await chatEvent(`${message.sender} rejoin the chat!`, 'success');
            break;
        case 'LEAVE':
            messageArea.innerHTML += await chatEvent(`${message.sender} quit the chat!`, 'warning');
            break;
        default:
            messageArea.innerHTML += chatMessage(message)
            break;

    }

    messageArea.scrollTop = messageArea.scrollHeight;
}

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', send, true);
disconnectButton.addEventListener('click', disconnect, true);


// Copyright 2017 Sebastian Ouellette

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// Voice-like channel types — joined, not typed in
const VOICE_CHANNEL_TYPES = [
    Discord.ChannelType.GuildVoice,
    Discord.ChannelType.GuildStageVoice,
];

// Forum-like channel types — post list view
const FORUM_CHANNEL_TYPES = [
    Discord.ChannelType.GuildForum,
    Discord.ChannelType.GuildMedia,
];

let channelSelect = (c, name) => {
    // ── Voice channels ──────────────────────────────────────────────────────
    if (VOICE_CHANNEL_TYPES.includes(c.type)) {
        selectedVoice = c;

        // Hide forum back bar if open
        document.getElementById('forumBackBar')?.remove();
        // Reset forum state
        if (typeof currentForumChannel !== 'undefined') {
            currentForumChannel = null;
            currentForumThread = null;
        }

        // Reset message-list if we were in forum view
        const messages = document.getElementById('message-list');
        messages.style.overflow = '';
        messages.style.padding = '';
        while (messages.firstChild) messages.removeChild(messages.firstChild);
        document.getElementById('sendmsg').style.display = 'none';

        // Join the voice channel
        joinVoice(c);
        return;
    }

    // ── Forum / Media channels ──────────────────────────────────────────────
    if (FORUM_CHANNEL_TYPES.includes(c.type)) {
        // Leave voice if active
        if (typeof currentVoiceChannel !== 'undefined' && currentVoiceChannel) {
            leaveVoice(true);
            const messages = document.getElementById('message-list');
            messages.style.overflow = '';
            messages.style.padding = '';
            while (messages.firstChild) messages.removeChild(messages.firstChild);
        }

        showForumPosts(c);
        return;
    }

    // ── Regular text-based channels ─────────────────────────────────────────
    if (!Discord.Constants.TextBasedChannelTypes.includes(c.type)) {
        // Unknown type — ignore silently
        return;
    }

    // Clean up voice/forum state
    if (typeof currentVoiceChannel !== 'undefined' && currentVoiceChannel) {
        leaveVoice(true);
    }
    document.getElementById('forumBackBar')?.remove();
    if (typeof currentForumChannel !== 'undefined') {
        currentForumChannel = null;
        currentForumThread = null;
    }

    if (generatingMessages) return;

    selectedChan = c;
    selectedChanDiv = name;
    name.style.color = '#eee';

    // Show send bar (might have been hidden)
    document.getElementById('sendmsg').style.display = '';

    // Set message bar placeholder
    document.getElementById('msgbox').placeholder = `Message #${c.name}`;

    // Remove new-message notification
    name.classList.remove('newMsg');

    const messages = document.getElementById('message-list');

    // Restore normal message-list styles in case coming from voice/forum
    messages.style.overflow = '';
    messages.style.padding = '';

    // Clear messages
    while (messages.firstChild) messages.removeChild(messages.firstChild);

    // Loading indicator
    const container = document.createElement('div');
    const loadingDots = document.createElement('div');
    loadingDots.classList.add('dot-bricks');
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.id = 'loading-container';
    container.appendChild(loadingDots);
    messages.appendChild(container);

    // Colour the channel name
    try {
        selectedChanDiv.style.color = '#606266';
        name.addEventListener('mouseover', () => {
            if (name.style.color != 'rgb(238, 238, 238)') name.style.color = '#B4B8BC';
        });
        name.addEventListener('mouseleave', () => {
            if (name.style.color != 'rgb(238, 238, 238)') name.style.color = '#606266';
        });
    } catch (err) {
        console.log(err);
    }

    // Refresh member list
    addMemberList(c.guild);

    // Fetch and render messages
    async function messageCreate() {
        generatingMessages = true;
        const fetchSize = 100;
        let count = 0;
        await c.messages.fetch({ limit: fetchSize }).then((msgs) => {
            msgs
                .toJSON()
                .reverse()
                .forEach((m) => {
                    count++;
                    const el = generateMsgHTML(
                        m,
                        msgs.toJSON().reverse()[count - 2],
                        count,
                        fetchSize
                    );
                    document.getElementById('message-list').appendChild(el);
                });
        });

        const shell = document.createElement('div');
        shell.classList.add('sorryNoLoad');
        const text = document.createElement('p');
        text.innerText = 'Sorry! No messages beyond this point can be displayed.';
        shell.appendChild(text);
        document.getElementById('message-list').prepend(shell);

        messages.scrollTop = messages.scrollHeight;
        generatingMessages = false;
        messages.removeChild(document.getElementById('loading-container'));
    }

    messageCreate();
    typingStatus(true);
};

let dmChannelSelect = async (u, name = 'test') => {
    if (u.bot || bot.user == u) return;
    const messages = document.getElementById('message-list');
    const fetchSize = 100;

    // Clean up voice/forum state
    if (typeof currentVoiceChannel !== 'undefined' && currentVoiceChannel) leaveVoice(true);
    document.getElementById('forumBackBar')?.remove();

    if (!u.dmChannel) await u.createDM();
    const c = u.dmChannel;

    if (generatingMessages) return;
    if (!u.openDM) u.openDM = true;

    if (selectedChatDiv) {
        selectedChatDiv.classList.remove('selectedChan');
        selectedChatDiv = undefined;
    }

    selectedChan = c;

    // Ensure send bar is visible
    document.getElementById('sendmsg').style.display = '';
    messages.style.overflow = '';
    messages.style.padding = '';

    typingStatus(true);
    document.getElementById('msgbox').placeholder = `Message #${c.recipient.username}`;

    while (messages.firstChild) messages.removeChild(messages.firstChild);

    async function messageCreate() {
        generatingMessages = true;
        let count = 0;
        await c.messages.fetch({ limit: fetchSize }).then((msgs) => {
            msgs
                .toJSON()
                .reverse()
                .forEach((m) => {
                    count++;
                    const el = generateMsgHTML(
                        m,
                        msgs.toJSON().reverse()[count - 2],
                        count,
                        fetchSize
                    );
                    document.getElementById('message-list').appendChild(el);
                });
        });

        const shell = document.createElement('div');
        shell.classList.add('sorryNoLoad');
        const text = document.createElement('p');
        text.innerText = 'Sorry! No messages beyond this point can be displayed.';
        shell.appendChild(text);
        document.getElementById('message-list').prepend(shell);

        messages.scrollTop = messages.scrollHeight;
        generatingMessages = false;
    }

    messageCreate();
};

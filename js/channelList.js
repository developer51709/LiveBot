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

// Channel types that are voice-like (joined, not typed in)
const VOICE_TYPES = [
    Discord.ChannelType.GuildVoice,
    Discord.ChannelType.GuildStageVoice,
];

// Channel types that are forum-like (post list view)
const FORUM_TYPES = [
    Discord.ChannelType.GuildForum,
    Discord.ChannelType.GuildMedia,
];

function createChannels(g) {
    // Clear the channels list
    let channelList = document.getElementById('channel-elements');
    while (channelList.firstChild)
        channelList.removeChild(channelList.firstChild);

    const realParent = document.getElementById('channel-elements');
    let parent = realParent;
    let categoryParent;

    // ── Build categories first ──────────────────────────────────────────────
    g.channels.cache
        .filter((c) => c.type == Discord.ChannelType.GuildCategory)
        .sort((c1, c2) => c1.rawPosition - c2.rawPosition)
        .each((c) => {
            let category = document.createElement('div');
            category.classList.add('category');
            category.classList.add('open');
            category.id = c.id;
            realParent.appendChild(category);

            let nameCategory = document.createElement('div');
            nameCategory.classList.add('categoryNameContainer');
            category.appendChild(nameCategory);

            let svg = document.createElement('img');
            svg.src = './resources/icons/categoryArrow.svg';
            svg.classList.add('categorySVG');
            nameCategory.appendChild(svg);

            let text = document.createElement('h5');
            text.classList.add('categoryText');
            text.innerText = c.name;
            nameCategory.appendChild(text);

            let div = document.createElement('div');
            div.classList.add('channelContainer');
            category.appendChild(div);

            nameCategory.addEventListener('click', () => {
                category.classList.toggle('open');
            });

            parent = div;
            categoryParent = c;
        });

    // ── Build non-category channels ─────────────────────────────────────────
    let openedDefaultChannel = false;

    g.channels.cache
        .filter((c) => !Discord.Constants.ThreadChannelTypes.includes(c.type))
        .map((c) => {
            // Voice and stage channels go after text channels in the sort
            if (VOICE_TYPES.includes(c.type)) {
                c.rawPosition = c.rawPosition + g.channels.cache.size;
            }
            // Forum/media channels sort naturally by position
            return c;
        })
        .filter((c) => c.type != Discord.ChannelType.GuildCategory)
        .sort((c1, c2) => c1.rawPosition - c2.rawPosition)
        .forEach((c) => {
            let div = document.createElement('div');
            div.classList.add('channel');
            div.id = c.id;

            // Add a type class for specific styling (voice, forum, etc.)
            const typeName = Discord.ChannelType[c.type];
            if (typeName) div.classList.add(typeName);

            // Check permissions
            let blocked = false;
            try {
                if (
                    !g.members.me
                        .permissionsIn(c)
                        .has(Discord.PermissionFlagsBits.ViewChannel) ||
                    (bot.hideUnallowed &&
                        g.members.cache
                            .get(bot.owner.id)
                            ?.permissionsIn(c)
                            .has(Discord.PermissionFlagsBits.ViewChannel) === false)
                ) {
                    blocked = true;
                    div.classList.add('blocked');
                }
            } catch (e) {
                // Some channel types don't support permissionsIn — skip them
            }

            // Icon: falls back gracefully if SVG doesn't exist
            let svg = document.createElement('img');
            svg.src = `./resources/icons/${typeName}Channel${blocked ? 'Blocked' : ''}.svg`;
            svg.classList.add('channelSVG');
            if (typeName) svg.classList.add(typeName);
            svg.onerror = () => {
                // Fallback to text channel icon if this type has no icon
                svg.src = `./resources/icons/GuildTextChannel${blocked ? 'Blocked' : ''}.svg`;
                svg.onerror = null;
            };
            div.appendChild(svg);

            // Channel name
            let channelName = document.createElement('h5');
            channelName.classList.add('viewableText');
            channelName.innerText = c.name;
            div.appendChild(channelName);

            // Member count badge for voice channels
            if (VOICE_TYPES.includes(c.type)) {
                const memberCount = g.voiceStates?.cache?.filter(
                    (vs) => vs.channelId === c.id
                )?.size || 0;

                if (memberCount > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'vcMemberBadge';
                    badge.textContent = memberCount;
                    div.appendChild(badge);
                }
            }

            // Append to the right parent
            if (c.parentId) {
                const categoryEl = document.getElementById(c.parentId);
                if (categoryEl) {
                    categoryEl.getElementsByTagName('div')[1].appendChild(div);
                } else {
                    realParent.insertBefore(div, realParent.querySelector('.category'));
                }
            } else {
                realParent.insertBefore(div, realParent.querySelector('.category'));
            }

            if (!blocked) {
                // Restore last-opened channel
                if (settings.guilds[settings.lastGuild] == c.id) {
                    channelSelect(c, div);
                    openedDefaultChannel = true;
                }

                if (global.selectedChanDiv && div.id == selectedChanDiv.id) {
                    div.classList.add('selectedChan');
                    selectedChanDiv = div;
                }

                div.addEventListener('click', () => {
                    const previous = realParent.querySelector('.selectedChan');
                    let prevId;
                    if (previous) {
                        prevId = previous.id;
                        if (prevId != c.id) previous.classList.remove('selectedChan');
                    }

                    if (prevId != c.id) {
                        settings.guilds = (() => {
                            let obj = {};
                            obj[c.guild.id] = c.id;
                            return { ...obj };
                        })();

                        div.classList.add('selectedChan');
                        channelSelect(c, div);
                    }
                });
            }
        });

    // ── Auto-open first accessible text channel if none saved ───────────────
    if (!openedDefaultChannel) {
        const chan = g.channels.cache
            .filter((c) => Discord.Constants.TextBasedChannelTypes.includes(c.type))
            .filter((c) =>
                g.members.me
                    .permissionsIn(c)
                    .has(Discord.PermissionFlagsBits.ViewChannel)
            )
            .sort((a, b) => a.rawPosition - b.rawPosition)
            .first();

        if (chan === undefined) {
            console.error('No available text channel to open');
        } else {
            const div = document.getElementById(chan.id);
            if (div) {
                div.classList.add('selectedChan');
                channelSelect(chan, div);
            }
        }
    }
}

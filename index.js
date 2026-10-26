const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ---------------- CONFIGURATION ----------------
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const TARGET_CHANNEL_ID = '1563681646501175437';
// -----------------------------------------------

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Define Slash Command
const commands = [
    new SlashCommandBuilder()
        .setName('voting')
        .setDescription('Start a community vote.')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('What are people voting for?')
                .setRequired(true))
        .toJSON()
];

// Register Command with Discord on startup
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        console.log('Refreshing slash commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Slash command /voting successfully registered!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// Handle Command Execution
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'voting') {
        await interaction.deferReply({ ephemeral: true });

        const votingTopic = interaction.options.getString('topic');
        const targetChannel = interaction.client.channels.cache.get(TARGET_CHANNEL_ID);

        if (!targetChannel) {
            return interaction.editReply({ content: '❌ Target voting channel not found. Check your CHANNEL_ID.' });
        }

        const votingEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🗳️ New Community Vote')
            .setDescription(`**Topic:**\n${votingTopic}`)
            .addFields({ name: 'How to vote', value: 'React with 👍 for Yes or 👎 for No below!' })
            .setTimestamp()
            .setFooter({ text: `Proposed by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        try {
            // 1. Send Embed
            const sentMessage = await targetChannel.send({ embeds: [votingEmbed] });

            // 2. Add Reactions
            await sentMessage.react('👍');
            await sentMessage.react('👎');

            // 3. Create Discussion Thread
            await sentMessage.startThread({
                name: `Discussion: ${votingTopic.substring(0, 80)}`,
                autoArchiveDuration: 1440,
                reason: `Voting thread started by ${interaction.user.tag}`
            });

            await interaction.editReply({ content: `✅ Posted voting embed and opened thread in <#${TARGET_CHANNEL_ID}>!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while creating the vote.' });
        }
    }
});

client.login(TOKEN);

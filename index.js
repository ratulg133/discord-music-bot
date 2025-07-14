const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const queue = new Map();
const TOKEN = process.env.TOKEN;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Setup command to create music channel
  if (message.content === '!setup') {
    let channel = await message.guild.channels.create({
      name: 'music-commands',
      type: 0,
      topic: 'Send song names or URLs here to play music.'
    });

    const embed = new EmbedBuilder()
      .setTitle('🎵 Music Control Panel')
      .setDescription('Send song names or links below.\n\nUse the buttons to control playback.')
      .setColor(0x00AE86);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pause').setLabel('⏸️ Pause').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('resume').setLabel('▶️ Resume').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('shuffle').setLabel('🔀 Shuffle').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    return message.reply(`✅ Music channel created: ${channel}`);
  }

  // Play song when message sent in music channel
  if (message.channel.name === 'music-commands') {
    const search = message.content.trim();
    if (!search) return;

    if (!message.member.voice.channel) {
      return message.reply('❗ Please join a voice channel first.');
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator
    });

    const stream = await play.stream(search, { quality: 2 });
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    message.channel.send(`🎵 Now playing: **${search}**`);

    player.on(AudioPlayerStatus.Idle, async () => {
      const info = await play.video_info(search);
      const next = info.related_videos?.[0]?.url;
      if (next) {
        const nextStream = await play.stream(next, { quality: 2 });
        const nextRes = createAudioResource(nextStream.stream, { inputType: nextStream.type });
        player.play(nextRes);
        message.channel.send(`🎶 Autoplaying: **${next}**`);
      }
    });
  }
});

client.login(TOKEN);

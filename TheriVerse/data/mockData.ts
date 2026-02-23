// TheriVerse Mock Data
// Complete mock dataset for MVP — all screens use this

export interface User {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
    type: 'therian' | 'furry' | 'both' | 'ally';
    pronouns?: string;
    location?: string;
    followers: number;
    following: number;
    posts: number;
    isVerified?: boolean;
    isArtist?: boolean;
    // Fursona layer
    fursona?: {
        species: string;
        palette: string;
        style: string;
    };
    // Therian layer
    therian?: {
        theriotypes: string[];
        shiftTags?: string[];
    };
}

export interface Post {
    id: string;
    userId: string;
    userName: string;
    userHandle: string;
    userAvatar: string;
    userType: string;
    content: string;
    image?: string;
    tags: string[];
    reactions: number;
    comments: number;
    shares: number;
    timeAgo: string;
    isLiked?: boolean;
    isSaved?: boolean;
}

export interface Pack {
    id: string;
    name: string;
    description: string;
    icon: string;
    members: number;
    category: string;
    isJoined?: boolean;
    color: string;
}

export interface Message {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    lastMessage: string;
    timeAgo: string;
    unread: number;
    isOnline?: boolean;
}

export interface Event {
    id: string;
    name: string;
    date: string;
    location: string;
    attendees: number;
    image: string;
    type: 'convention' | 'meetup' | 'online';
}

export interface DatingProfile {
    id: string;
    name: string;
    age: number;
    avatar: string;
    bio: string;
    species: string;
    distance: string;
    interests: string[];
    photos: string[];
}

// === Current user ===
export const currentUser: User = {
    id: 'me',
    name: 'Luna Silver',
    handle: '@lunasilver',
    avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Luna&backgroundColor=b6e3f4',
    bio: '🐺 Wolf therian | Art lover | Convention goer\nFinding my pack in this wild world ✨',
    type: 'both',
    pronouns: 'she/they',
    location: 'Buenos Aires, AR',
    followers: 342,
    following: 189,
    posts: 47,
    isVerified: true,
    fursona: {
        species: 'Arctic Wolf',
        palette: 'Silver, Ice Blue, White',
        style: 'Semi-realistic',
    },
    therian: {
        theriotypes: ['Gray Wolf', 'Arctic Fox'],
        shiftTags: ['phantom shifts', 'dream shifts', 'mental shifts'],
    },
};

// === Mock users ===
export const users: User[] = [
    {
        id: '1',
        name: 'Kael Storm',
        handle: '@kaelstorm',
        avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc',
        bio: '🦊 Red fox fursona | Digital artist | Commissions open!',
        type: 'furry',
        pronouns: 'he/him',
        location: 'Madrid, ES',
        followers: 1205,
        following: 340,
        posts: 156,
        isArtist: true,
        fursona: { species: 'Red Fox', palette: 'Orange, Cream, Black', style: 'Toony' },
    },
    {
        id: '2',
        name: 'Willow Creek',
        handle: '@willowcreek',
        avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Willow&backgroundColor=c0aede',
        bio: '🦌 Deer therian | Nature lover | Quiet vibes 🌿',
        type: 'therian',
        location: 'Portland, US',
        followers: 567,
        following: 210,
        posts: 83,
        therian: { theriotypes: ['White-tailed Deer'], shiftTags: ['phantom shifts', 'cameo shifts'] },
    },
    {
        id: '3',
        name: 'Blaze Fury',
        handle: '@blazefury',
        avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Blaze&backgroundColor=ffdfbf',
        bio: '🐉 Dragon + Wolf hybrid | Fursuiter | Convention addict 🔥',
        type: 'both',
        pronouns: 'they/them',
        location: 'Berlin, DE',
        followers: 2340,
        following: 501,
        posts: 312,
        isVerified: true,
        fursona: { species: 'Dragon-Wolf Hybrid', palette: 'Red, Black, Gold', style: 'Realistic' },
        therian: { theriotypes: ['Gray Wolf'], shiftTags: ['mental shifts'] },
    },
    {
        id: '4',
        name: 'Nyx Shadow',
        handle: '@nyxshadow',
        avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Nyx&backgroundColor=d1d4f9',
        bio: '🐱 Cat therian | Pixel art | Cozy den vibes 💜',
        type: 'therian',
        pronouns: 'she/her',
        location: 'Tokyo, JP',
        followers: 890,
        following: 150,
        posts: 201,
        isArtist: true,
        fursona: { species: 'Black Cat', palette: 'Black, Purple, Silver', style: 'Pixel Art' },
        therian: { theriotypes: ['Domestic Cat', 'Panther'] },
    },
    {
        id: '5',
        name: 'River Song',
        handle: '@riversong',
        avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=River&backgroundColor=bde0fe',
        bio: '🐺 Wolf pack leader | Community mod | Pack Map enthusiast',
        type: 'both',
        pronouns: 'he/they',
        location: 'Vancouver, CA',
        followers: 1540,
        following: 420,
        posts: 95,
        isVerified: true,
        fursona: { species: 'Timber Wolf', palette: 'Gray, White, Amber', style: 'Semi-realistic' },
        therian: { theriotypes: ['Timber Wolf'] },
    },
];

// === Mock posts ===
export const posts: Post[] = [
    {
        id: 'p1',
        userId: '1',
        userName: 'Kael Storm',
        userHandle: '@kaelstorm',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc',
        userType: 'furry',
        content: 'Just finished this new ref sheet for my fursona! 🎨🦊 What do you think? Spent about 20 hours on this one. Commissions are open if anyone wants one!',
        image: 'https://picsum.photos/seed/foxart/600/400',
        tags: ['#furryart', '#commission', '#refsheet'],
        reactions: 234,
        comments: 42,
        shares: 18,
        timeAgo: '2h',
        isLiked: true,
    },
    {
        id: 'p2',
        userId: '2',
        userName: 'Willow Creek',
        userHandle: '@willowcreek',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Willow&backgroundColor=c0aede',
        userType: 'therian',
        content: 'Had the most incredible phantom shift today while hiking through the forest 🌿🦌 The way the sunlight filtered through the trees... I felt so connected. Anyone else get shifts in nature?',
        tags: ['#therian', '#phantomshift', '#nature'],
        reactions: 189,
        comments: 56,
        shares: 12,
        timeAgo: '4h',
    },
    {
        id: 'p3',
        userId: '3',
        userName: 'Blaze Fury',
        userHandle: '@blazefury',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Blaze&backgroundColor=ffdfbf',
        userType: 'both',
        content: '🔥 WHO\'S GOING TO EUROFURENCE THIS YEAR?! 🔥\n\nI just booked my hotel and I\'m SO hyped! Looking for people to hang out with. Drop a 🐾 if you\'re going!\n\n#EF2026 #Convention #Fursuiting',
        image: 'https://picsum.photos/seed/convention/600/350',
        tags: ['#convention', '#eurofurence', '#fursuiting'],
        reactions: 567,
        comments: 134,
        shares: 89,
        timeAgo: '6h',
        isLiked: true,
        isSaved: true,
    },
    {
        id: 'p4',
        userId: '4',
        userName: 'Nyx Shadow',
        userHandle: '@nyxshadow',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Nyx&backgroundColor=d1d4f9',
        userType: 'therian',
        content: 'New pixel art of my panther theriotype! 🐱✨ This took me forever but I\'m proud of how it turned out. Who else does art of their theriotype?',
        image: 'https://picsum.photos/seed/pixelcat/600/600',
        tags: ['#pixelart', '#therian', '#cattherian'],
        reactions: 312,
        comments: 67,
        shares: 45,
        timeAgo: '8h',
    },
    {
        id: 'p5',
        userId: '5',
        userName: 'River Song',
        userHandle: '@riversong',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=River&backgroundColor=bde0fe',
        userType: 'both',
        content: 'Reminder to everyone: take care of your mental health 💜\n\nBeing part of this community is amazing, but it\'s okay to take breaks. Your well-being always comes first. You are valid. You are loved. 🐾',
        tags: ['#mentalhealth', '#community', '#support'],
        reactions: 892,
        comments: 201,
        shares: 156,
        timeAgo: '12h',
    },
    {
        id: 'p6',
        userId: '1',
        userName: 'Kael Storm',
        userHandle: '@kaelstorm',
        userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc',
        userType: 'furry',
        content: 'Poll time! 🗳️ Best furry convention you\'ve been to?',
        tags: ['#poll', '#convention', '#furry'],
        reactions: 145,
        comments: 89,
        shares: 5,
        timeAgo: '1d',
    },
];

// === Mock stories ===
export const stories = [
    { id: 's1', userId: '3', userName: 'Blaze', avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Blaze&backgroundColor=ffdfbf', hasNew: true },
    { id: 's2', userId: '1', userName: 'Kael', avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc', hasNew: true },
    { id: 's3', userId: '4', userName: 'Nyx', avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Nyx&backgroundColor=d1d4f9', hasNew: true },
    { id: 's4', userId: '2', userName: 'Willow', avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Willow&backgroundColor=c0aede', hasNew: false },
    { id: 's5', userId: '5', userName: 'River', avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=River&backgroundColor=bde0fe', hasNew: false },
];

// === Mock packs ===
export const packs: Pack[] = [
    { id: 'g1', name: 'Wolf Pack United', description: 'For all wolf therians and wolf fursonas! Share experiences, art, and connect.', icon: '🐺', members: 2340, category: 'Species', isJoined: true, color: '#7B2FBE' },
    { id: 'g2', name: 'Furry Artists Hub', description: 'Commission tips, art sharing, critique sessions, and portfolio reviews.', icon: '🎨', members: 5670, category: 'Art', isJoined: true, color: '#FF6B35' },
    { id: 'g3', name: 'Therian Support Circle', description: 'A safe space to discuss shifts, identity, and well-being. No judgment.', icon: '💜', members: 1890, category: 'Wellbeing', color: '#9B59D0' },
    { id: 'g4', name: 'Convention Goers', description: 'Plan meetups, share tips, and find roommates for conventions worldwide!', icon: '🎪', members: 3210, category: 'Events', color: '#00D4AA' },
    { id: 'g5', name: 'Fursuit Makers & Fans', description: 'Build logs, tips, reviews, and fursuit photos. Makers welcome!', icon: '🧵', members: 4560, category: 'Fursuiting', isJoined: true, color: '#2196F3' },
    { id: 'g6', name: 'Cat Therians Den', description: 'All felines welcome! Discuss your theriotype experiences.', icon: '🐱', members: 1230, category: 'Species', color: '#FFB300' },
    { id: 'g7', name: 'LATAM Furries', description: '¡Comunidad furry y therian de Latinoamérica! Meetups, arte, charlas.', icon: '🌎', members: 890, category: 'Regional', color: '#00C853' },
    { id: 'g8', name: 'Digital Art Academy', description: 'Tutorials, WIPs, and feedback for digital furry/therian art.', icon: '💻', members: 3450, category: 'Art', color: '#FF3D57' },
];

// === Mock messages ===
export const messages: Message[] = [
    { id: 'm1', userId: '3', userName: 'Blaze Fury', userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Blaze&backgroundColor=ffdfbf', lastMessage: 'See you at EuroFurence! 🔥', timeAgo: '5m', unread: 3, isOnline: true },
    { id: 'm2', userId: '1', userName: 'Kael Storm', userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc', lastMessage: 'Your commission is almost done!', timeAgo: '1h', unread: 1, isOnline: true },
    { id: 'm3', userId: '4', userName: 'Nyx Shadow', userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Nyx&backgroundColor=d1d4f9', lastMessage: 'That pixel art was beautiful 💜', timeAgo: '3h', unread: 0, isOnline: false },
    { id: 'm4', userId: '2', userName: 'Willow Creek', userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Willow&backgroundColor=c0aede', lastMessage: 'Nature hike this weekend?', timeAgo: '1d', unread: 0, isOnline: false },
    { id: 'm5', userId: '5', userName: 'River Song', userAvatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=River&backgroundColor=bde0fe', lastMessage: 'Pack meeting tomorrow 🐾', timeAgo: '2d', unread: 0, isOnline: true },
];

// === Mock events ===
export const events: Event[] = [
    { id: 'e1', name: 'EuroFurence 2026', date: 'Aug 14-18, 2026', location: 'Berlin, Germany', attendees: 3400, image: 'https://picsum.photos/seed/eurofurence/600/300', type: 'convention' },
    { id: 'e2', name: 'LATAM Furry Meet', date: 'Mar 22, 2026', location: 'Buenos Aires, AR', attendees: 120, image: 'https://picsum.photos/seed/latammeet/600/300', type: 'meetup' },
    { id: 'e3', name: 'Therian Online Gathering', date: 'Feb 28, 2026', location: 'Discord / TheriVerse', attendees: 560, image: 'https://picsum.photos/seed/onlinegathering/600/300', type: 'online' },
];

// === Mock dating profiles ===
export const datingProfiles: DatingProfile[] = [
    { id: 'd1', name: 'Kael Storm', age: 24, avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Kael&backgroundColor=ffd5dc', bio: 'Fox furry artist looking for creative souls 🎨🦊', species: 'Red Fox', distance: '12 km', interests: ['Art', 'Conventions', 'Gaming'], photos: ['https://picsum.photos/seed/kael1/400/500', 'https://picsum.photos/seed/kael2/400/500'] },
    { id: 'd2', name: 'Willow Creek', age: 22, avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Willow&backgroundColor=c0aede', bio: 'Deer therian | Nature walks and deep talks 🌿🦌', species: 'White-tailed Deer', distance: '8 km', interests: ['Nature', 'Photography', 'Meditation'], photos: ['https://picsum.photos/seed/willow1/400/500', 'https://picsum.photos/seed/willow2/400/500'] },
    { id: 'd3', name: 'Blaze Fury', age: 27, avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Blaze&backgroundColor=ffdfbf', bio: 'Dragon-Wolf hybrid 🐉🐺 Convention addict. Let\'s meet IRL!', species: 'Dragon-Wolf', distance: '25 km', interests: ['Conventions', 'Fursuiting', 'Travel'], photos: ['https://picsum.photos/seed/blaze1/400/500', 'https://picsum.photos/seed/blaze2/400/500'] },
    { id: 'd4', name: 'Nyx Shadow', age: 21, avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/png?seed=Nyx&backgroundColor=d1d4f9', bio: 'Cat therian 🐱 Pixel art queen. Looking for cozy vibes 💜', species: 'Black Cat', distance: '5 km', interests: ['Pixel Art', 'Anime', 'Cozy Games'], photos: ['https://picsum.photos/seed/nyx1/400/500', 'https://picsum.photos/seed/nyx2/400/500'] },
];

// === Trending tags ===
export const trendingTags = [
    { tag: '#therian', posts: 12400 },
    { tag: '#furryart', posts: 8900 },
    { tag: '#phantomshift', posts: 3200 },
    { tag: '#commission', posts: 6700 },
    { tag: '#convention', posts: 5100 },
    { tag: '#fursuit', posts: 4300 },
    { tag: '#wolfpack', posts: 2800 },
    { tag: '#cattherian', posts: 1900 },
];

// === Onboarding options ===
export const userTypes = [
    { id: 'therian', label: 'Therian', icon: '🐾', desc: 'I identify with one or more animal theriotypes' },
    { id: 'furry', label: 'Furry', icon: '🦊', desc: 'I have a fursona and love the furry community' },
    { id: 'both', label: 'Both', icon: '🐺', desc: 'I\'m both therian and furry!' },
    { id: 'ally', label: 'Ally', icon: '💜', desc: 'I support the community and want to learn' },
];

export const interestOptions = [
    { id: 'art', label: 'Art & Commissions', icon: '🎨' },
    { id: 'community', label: 'Community & Packs', icon: '🐾' },
    { id: 'dating', label: 'Dating & Connections', icon: '💘' },
    { id: 'events', label: 'Events & Conventions', icon: '🎪' },
    { id: 'fursuiting', label: 'Fursuiting', icon: '🧵' },
    { id: 'identity', label: 'Identity & Shifts', icon: '🌙' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'music', label: 'Music', icon: '🎵' },
];

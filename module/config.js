// Namespace Configuration Values
export const MB = {};

MB.systemName = "crysborg";

// order of abilities on the character sheet
MB.abilitySheetOrder = ["strength", "agility", "presence", "toughness"];

MB.armorTiers = {
  0: {
    key: "MB.ArmorTierNone",
    damageReductionDie: "0",
    agilityModifier: 0,
    defenseModifier: 0,
  },
  1: {
    key: "MB.ArmorTierLight",
    damageReductionDie: "d2",
    agilityModifier: 0,
    defenseModifier: 0,
  },
  2: {
    key: "MB.ArmorTierMedium",
    damageReductionDie: "d4",
    agilityModifier: 2,
    defenseModifier: 2,
  },
  3: {
    key: "MB.ArmorTierHeavy",
    damageReductionDie: "d6",
    agilityModifier: 4,
    defenseModifier: 2,
  },
};

MB.colorSchemes = {
  blackOnYellowWhite: {
    background: "#ffe900",
    foreground: "#000000",
    foregroundAlt: "#808080",
    highlightBackground: "#ffffff",
    highlightForeground: "#000000",
    sidebarBackground: "#ffe900",
    sidebarForeground: "000000",
    sidebarButtonBackground: "#000000",
    sidebarButtonForeground: "#ffe900",
    windowBackground: "#ffe900",
  },
  blackOnWhiteBlack: {
    background: "#ffffff",
    foreground: "#000000",
    foregroundAlt: "#808080",
    highlightBackground: "#000000",
    highlightForeground: "#ffffff",
    sidebarBackground: "#ffffff",
    sidebarForeground: "#000000",
    sidebarButtonBackground: "#000000",
    sidebarButtonForeground: "#ffffff",
    windowBackground: "#ffffff",
  },
  foundryDefault: {
    background: "#f0f0e0",
    foreground: "#191813",
    foregroundAlt: "red",
    highlightBackground: "#191813",
    highlightForeground: "#f0f0e0",
    sidebarBackground: "url(../assets/ui/denim.jpg) repeat",
    sidebarForeground: "#f0f0e0",
    sidebarButtonBackground: "#f0f0e0",
    sidebarButtonForeground: "#000000",
    windowBackground: "url(../assets/ui/parchment.jpg) repeat",
  },
  whiteOnBlackYellow: {
    background: "#000000",
    foreground: "#ffffff",
    foregroundAlt: "#ffe900",
    highlightBackground: "#ffe900",
    highlightForeground: "#000000",
    sidebarBackground: "#000000",
    sidebarForeground: "#ffffff",
    sidebarButtonBackground: "#ffffff",
    sidebarButtonForeground: "#000000",
    windowBackground: "#000000AA",
  },
  whiteOnBlackPink: {
    background: "#000000",
    foreground: "#ffffff",
    foregroundAlt: "#ff3eb5",
    highlightBackground: "#ff3eb5",
    highlightForeground: "#000000",
    sidebarBackground: "#000000",
    sidebarForeground: "#ffffff",
    sidebarButtonBackground: "#ffffff",
    sidebarButtonForeground: "#000000",
    windowBackground: "#000000",
  },
  whiteOnPinkWhite: {
    background: "#ff3eb5",
    foreground: "#ffffff",
    foregroundAlt: "#000000",
    highlightBackground: "#ffffff",
    highlightForeground: "#000000",
    sidebarBackground: "#ff3eb5",
    sidebarForeground: "#ffffff",
    sidebarButtonBackground: "#ffffff",
    sidebarButtonForeground: "#ff3eb5",
    windowBackground: "#ff3eb5",
  },
  CrysBorgSignature: {
    background: "#401C33",
    foreground: "#ffffff",
    foregroundAlt: "#00010D",
    highlightBackground: "#30588C",
    highlightForeground: "#00010D",
    sidebarBackground: "#401C33",
    sidebarForeground: "#30588C",
    sidebarButtonBackground: "#30588C",
    sidebarButtonForeground: "#00010D",
    windowBackground: "#401C33",
  },
  CrysBorgSignatureAlt: {
    background: "#30588C",
    foreground: "#00010D",
    foregroundAlt: "#ffffff",
    highlightBackground: "#401C33",
    highlightForeground: "#ffffff",
    sidebarBackground: "#30588C",
    sidebarForeground: "#401C33",
    sidebarButtonBackground: "#401C33",
    sidebarButtonForeground: "#ffffff",
    windowBackground: "#30588C",
  },
  GoblinGonzo: {
    background: "#2e9b27",
    foreground: "#000000",
    foregroundAlt: "#808080",
    highlightBackground: "#ffffff",
    highlightForeground: "#000000",
    sidebarBackground: "#2e9b27",
    sidebarForeground: "000000",
    sidebarButtonBackground: "#000000",
    sidebarButtonForeground: "#2e9b27",
    windowBackground: "#2e9b27",
  }
};

MB.flags = {
  ATTACK_DR: "attackDR",
  DEFEND_DR: "defendDR",
  INCOMING_ATTACK: "incomingAttack",
  TARGET_ARMOR: "targetArmor",
};

MB.fontSchemes = {
  blackletter: {
    chat: "Alegreya",
    chatInfo: "Oswald",
    h1: "Deutsch Gothic",
    h2: "FetteTrumpDeutsch",
    h3: "Old Cupboard",
    item: "Calling Code",
  },
  legible: {
    chat: "Alegreya",
    chatInfo: "Oswald",
    h1: "JSL Ancient",
    h2: "Inconsolatazi4varl_qu",
    h3: "JSL Ancient",
    //h3: "Old Cupboard",
    item: "Lato",
  },
  CrysBorgSignatureFont: {
    chat: "Alegreya",
    chatInfo: "Oswald",
    h1: "Black Range",
    h2: "Blank River",
    h3: "Covered by your grace",
    item: "Calling Code",
  },
};

MB.handed = {
  1: "MB.HandedOne",
  2: "MB.HandedTwo",
};

MB.actorTypes = {
  character: "character",
  creature: "creature",
  container: "container",
  follower: "follower",
  miseryTracker: "misery-tracker",
};

MB.ammoTypes = {
  arrow: "MB.AmmoTypeArrow",
  bolt: "MB.AmmoTypeBolt",
  slingstone: "MB.AmmoTypeSlingstone",
};

MB.itemTypes = {
  ammo: "ammo",
  armor: "armor",
  class: "class",
  container: "container",
  feat: "feat",
  misc: "misc",
  scroll: "scroll",
  shield: "shield",
  weapon: "weapon",
};

MB.itemTypeKeys = {
  ammo: "MB.ItemTypeAmmo",
  armor: "MB.ItemTypeArmor",
  class: "MB.ItemTypeClass",
  container: "MB.ItemTypeContainer",
  feat: "MB.ItemTypeFeat",
  misc: "MB.ItemTypeMisc",
  scroll: "MB.ItemTypeScroll",
  shield: "MB.ItemTypeShield",
  weapon: "MB.ItemTypeWeapon",
};

// these Item types are "equipment"
MB.itemEquipmentTypes = [
  MB.itemTypes.ammo,
  MB.itemTypes.armor,
  MB.itemTypes.container,
  MB.itemTypes.misc,
  MB.itemTypes.scroll,
  MB.itemTypes.shield,
  MB.itemTypes.weapon,
];

MB.allowedContainerItemTypes = [
  MB.itemTypes.ammo,
  MB.itemTypes.armor,
  MB.itemTypes.misc,
  MB.itemTypes.scroll,
  MB.itemTypes.shield,
  MB.itemTypes.weapon,
];

MB.equippableItemTypes = [
  MB.itemTypes.armor,
  MB.itemTypes.shield,
  MB.itemTypes.weapon,
];

MB.droppableItemTypes = [MB.itemTypes.container];

MB.plusMinusItemTypes = [MB.itemTypes.ammo, MB.itemTypes.misc];

MB.scrollTypes = {
  sacred: "MB.ScrollTypeSacred",
  tablet: "MB.ScrollTypeTablet",
  unclean: "MB.ScrollTypeUnclean",
  chaotic: "MB.ScrollTypeChaotic",
  GoblinSong: "MB.ScrollTypeGoblinSong",
};

MB.weaponTypes = {
  melee: "MB.WeaponTypeMelee",
  ranged: "MB.WeaponTypeRanged",
};

// Config variables for the Scvmfactory character generator
MB.scvmFactory = {
  // Character Names
  namesTable: "Compendium.crysborg.crys-borg-tables.RollTable.tBHfdSGFvfmrLreR",
  // Dried food
  foodItem: "Compendium.crysborg.crys-borg-items.Item.4kuVcY67MIDA6Imc",
  // Waterskin
  waterItem: "Compendium.crysborg.crys-borg-items.Item.Zrs4ubq4fDBNPmnN",
  // Starting Equipment (1)
  startingEquipmentTable1Uuids: [
    //standard 1
    "Compendium.crysborg.crys-borg-tables.RollTable.ByN7RI3Vc88ScBCj",
    //Goblin Gonzo 1
    "Compendium.crysborg.crys-borg-tables.RollTable.o1vuH9VzxynC8tkt"
  ],
  // Starting Equipment (2)
  startingEquipmentTable2Uuids: [
    //standard 2
    "Compendium.crysborg.crys-borg-tables.RollTable.o6wjXShp2CLQEr7X",
    //Goblin Gonzo 2
    "Compendium.crysborg.crys-borg-tables.RollTable.AG2h21KhlvQE24vc"
  ],
  // Starting Equipment (3)
  startingEquipmentTable3Uuids: [
    //standard 3
    "Compendium.crysborg.crys-borg-tables.RollTable.rq8zq4VHY3px5hpF",
    //Goblin Gonzo 3
    "Compendium.crysborg.crys-borg-tables.RollTable.2xMFKDNCuYC74IcV"
  ],
  // Starting Weapon
  //startingWeaponTable:
  ///  "Compendium.crysborg.crys-borg-tables.RollTable.qYznag89iDMdPH6A",
  weaponDieIfRolledScroll: "1d6",
  // Starting Armor
  startingArmorTable:
    "Compendium.crysborg.crys-borg-tables.RollTable.Cyg5IvubZiDmCCUk",
  armorDieIfRolledScroll: "1d2",
  // Terribler Traits
  terribleTraitsTable:
    "Compendium.crysborg.crys-borg-tables.RollTable.cu7r9xbByoMfofmM",
  // Brokener Bodies
  brokenBodiesTable:
    "Compendium.crysborg.crys-borg-tables.RollTable.tmQ9sL1SyqgAh2ch",
  // Badder Habits
  badHabitsTable:
    "Compendium.crysborg.crys-borg-tables.RollTable.3NeMMJHRRW517LGP",
  // Personality Quirks
  personalityQuirksTable:
    "Compendium.crysborg.crys-borg-tables.RollTable.ISl0rKeu2m90swtr",
  // Weapon Tables
  weaponTableUuids: [
    //standard
    "Compendium.crysborg.crys-borg-tables.RollTable.qYznag89iDMdPH6A",
    //ggtribal
    "Compendium.crysborg.crys-borg-tables.RollTable.xENPiMlkLkz6Au5q",
    //ggfancy
    "Compendium.crysborg.crys-borg-tables.RollTable.B5jFEpqp8xW13ooj",
    //ggbrutal
    "Compendium.crysborg.crys-borg-tables.RollTable.FTNU1dnaczi0grsZ",
    //ggimprovised
    "Compendium.crysborg.crys-borg-tables.RollTable.jqS87vdL1uUXXgY2"
  ],
  // modules wanting to add more character classes to the generator should append uuids to this list
  standardclassUuids: [
    // classless adventurer
    "Compendium.crysborg.crys-borg-items.p693pMIVYXMSRl8S",
    // cursed skinwalker
    "Compendium.crysborg.crys-borg-items.ZuSWpDI76OliQUrE",
    // dead god's prophet
    "Compendium.crysborg.crys-borg-items.BNOhaA4ebt6Bzx4E",
    // esoteric hermit
    "Compendium.crysborg.crys-borg-items.ifSBk6ORiHgq3Xhr",
    // fanged deserter
    "Compendium.crysborg.crys-borg-items.2hjl45o4vXOgRgfq",
    // forlorn philosopher
    "Compendium.crysborg.crys-borg-items.L9Vwzbx5o0OMdJm0",
    // gutterborn scum
    "Compendium.crysborg.crys-borg-items.gAx8MWLiZcjiWQvc",
    // heretical priest
    "Compendium.crysborg.crys-borg-items.8CTmhMvQ5BJlGD2o",
    // occult herbmaster
    "Compendium.crysborg.crys-borg-items.59HKbdpBIXfiJt91",
    // pale one
    "Compendium.crysborg.crys-borg-items.wLJV0VJT5I234obT",
    // sacrilegious songbird
    "Compendium.crysborg.crys-borg-items.Y0KSTCrUAQNoBKEX",
    // wretched royalty
    "Compendium.crysborg.crys-borg-items.0h5xOAtzV4mm7X7D",
	  // hermetic cynanthrope
	  "Compendium.crysborg.crys-borg-items.Item.V88NoV3knYyVTJXe",
	  // shonky skulker
	  "Compendium.crysborg.crys-borg-items.Item.pVCSePXpTtGIuZPV",
	  // half breed
	  "Compendium.crysborg.crys-borg-items.Item.JeOKJjdOdBAYfNiS",
    // betrayed phantom
    "Compendium.crysborg.crys-borg-items.Item.tZo8QZBZrH9fBeNI",
    // Blighted Merman
    "Compendium.crysborg.crys-borg-items.Item.G9NM1nMI7cwa4DE2", 
    // Blood Knight
    "Compendium.crysborg.crys-borg-items.Item.Yhnqcnwb7DzHx2ov", 
    // Catacomb Saint
    "Compendium.crysborg.crys-borg-items.Item.ktYfH0f5gY4cCHMl", 
    // Damned Blade-Thrall
    "Compendium.crysborg.crys-borg-items.Item.jpmK3KOXx4i3WLAA", 
    // Death Hunter
    "Compendium.crysborg.crys-borg-items.Item.yaprmub7NRMrmgzn", 
    // Divine Hag
    "Compendium.crysborg.crys-borg-items.Item.tca5SWJ2IaTmiDHs", 
    // Exalted Gambler
    "Compendium.crysborg.crys-borg-items.Item.wa4yxdTBpSVtzwVA", 
    // Fanatic Physician
    "Compendium.crysborg.crys-borg-items.Item.ITWQGGF3AFUGcAMr", 
    // Fugitive Knight
    "Compendium.crysborg.crys-borg-items.Item.Z9qYuZkoa0txg1TX", 
    // Guilt Bearer
    "Compendium.crysborg.crys-borg-items.Item.kjvlgGzKGSF2cv4y", 
    // Rotting Necromancer
    "Compendium.crysborg.crys-borg-items.Item.PHhZQuw3dn8Ssfhe", 
    // Sin Eater
    "Compendium.crysborg.crys-borg-items.Item.GhuFnPrfEgzS0NjU", 
    // Sinful Sailor
    "Compendium.crysborg.crys-borg-items.Item.2ciG5JtfVXXAI3vA", 
    // Slapping Bastard
    "Compendium.crysborg.crys-borg-items.Item.qPSUBgeMWRkCtQFq", 
    // Soul-Damned Drunkard
    "Compendium.crysborg.crys-borg-items.Item.j4jZAUI4wbkitPDp", 
    // Svampätare
    "Compendium.crysborg.crys-borg-items.Item.g8JnRKWDxp92Bbs1", 
    // "The" Bellfounder
    "Compendium.crysborg.crys-borg-items.Item.JNvP1NLKQ577RBQw",
    // Nachtreuter
    "Compendium.crysborg.crys-borg-items.Item.HfOQu1caHVJWptf5",
    // Red Cap
    "Compendium.crysborg.crys-borg-items.Item.mqKoeRYUe6PK85ZV",
    // Shedding Vicar
    "Compendium.crysborg.crys-borg-items.Item.jWYKvk5nC0pgwCWN",
    // Cavernous Dweller
    "Compendium.crysborg.crys-borg-items.Item.vfvhCaRvosnfml3p",
    // Goblin Grifter
    "Compendium.crysborg.crys-borg-items.Item.V7TpzPFv9vZf1glJ",
    // Mutant Runagate
    "Compendium.crysborg.crys-borg-items.Item.wTMFFBIFSOntJLF3",
    // Ogre Humongobb
    "Compendium.crysborg.crys-borg-items.Item.QAj1XGMRlH9IuHhB",
    // Sump Goblin
    "Compendium.crysborg.crys-borg-items.Item.V6ZsGYO64KeCVaff",
    // The Kwark
    "Compendium.crysborg.crys-borg-items.Item.3QqFyaBU9KAfR4kt",
    // Tribal Goblin
    "Compendium.crysborg.crys-borg-items.Item.ctjIl8jgM3TkzTP7",
    // Bone Slave
    "Compendium.crysborg.crys-borg-items.Item.j1Fe9LK0GZNRTFmw",
    // Godless Souldoctor
    "Compendium.crysborg.crys-borg-items.Item.T7Q57Fy28BDNw857",
    // The Sharp Card
    "Compendium.crysborg.crys-borg-items.Item.ac1czxIr7jiLmK4s",
    // Tormented Toymaker
    "Compendium.crysborg.crys-borg-items.Item.IO8MTmjYrlboDsSY"
  ],
};

MB.brokenPack = "crysborg.crys-borg-tables";
MB.brokenTable = "Broken";

MB.wieldPowerFumbleOn = 1;
MB.wieldPowerFumblePack = "crysborg.crys-borg-tables";
MB.wieldPowerFumbleTable = "Arcane Catastrophes";

MB.wieldPowerCritOn = 20;
MB.wieldPowerCritPack = null;
MB.wieldPowerCritTable = null;

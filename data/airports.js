const cities = [
  {
    city: "Abu Dhabi",
    iata: "AUH",
    airport: "Zayed International Airport",
  },
  {
    city: "Agadir",
    iata: "AGA",
    airport: "Agadir–Al Massira Airport",
  },
  {
    city: "Algiers",
    iata: "ALG",
    airport: "Houari Boumediene Airport",
  },
  {
    city: "Alicante",
    iata: "ALC",
    airport: "Alicante–Elche Miguel Hernández Airport",
  },
  {
    city: "Amman",
    iata: "AMM",
    airport: "Queen Alia International Airport",
  },
  {
    city: "Amsterdam",
    iata: "AMS",
    airport: "Amsterdam Airport Schiphol",
  },
  {
    city: "Ankara",
    iata: "ESB",
    airport: "Esenboğa International Airport",
  },
  {
    city: "Antalya",
    iata: "AYT",
    airport: "Antalya Airport",
  },
  {
    city: "Athens",
    iata: "ATH",
    airport: "Athens International Airport",
  },
  {
    city: "Baku",
    iata: "GYD",
    airport: "Heydar Aliyev International Airport",
  },
  {
    city: "Bangkok",
    iata: "BKK",
    airport: "Suvarnabhumi Airport",
  },
  {
    city: "Barcelona",
    iata: "BCN",
    airport: "Josep Tarradellas Barcelona–El Prat Airport",
  },
  {
    city: "Bari",
    iata: "BRI",
    airport: "Bari Karol Wojtyła Airport",
  },
  {
    city: "Basel Mulhouse Freiburg",
    iata: "BSL",
    airport: "EuroAirport Basel Mulhouse Freiburg",
  },
  {
    city: "Beijing",
    iata: "PEK",
    airport: "Beijing Capital International Airport",
  },
  {
    city: "Belgrade",
    iata: "BEG",
    airport: "Belgrade Nikola Tesla Airport",
  },
  {
    city: "Bergamo",
    iata: "BGY",
    airport: "Il Caravaggio International Airport",
  },
  {
    city: "Bergen",
    iata: "BGO",
    airport: "Bergen Airport, Flesland",
  },
  {
    city: "Berlin",
    iata: "BER",
    airport: "Berlin Brandenburg Airport",
  },
  {
    city: "Bilbao",
    iata: "BIO",
    airport: "Bilbao Airport",
  },
  {
    city: "Billund",
    iata: "BLL",
    airport: "Billund Airport",
  },
  {
    city: "Birmingham",
    iata: "BHX",
    airport: "Birmingham Airport",
  },
  {
    city: "Bodrum",
    iata: "BJV",
    airport: "Milas–Bodrum Airport",
  },
  {
    city: "Bologna",
    iata: "BLQ",
    airport: "Bologna Guglielmo Marconi Airport",
  },
  {
    city: "Bordeaux",
    iata: "BOD",
    airport: "Bordeaux–Mérignac Airport",
  },
  {
    city: "Boston",
    iata: "BOS",
    airport: "Boston Logan International Airport",
  },
  {
    city: "Brasov",
    iata: "GHV",
    airport: "Brașov–Ghimbav International Airport",
  },
  {
    city: "Bratislava",
    iata: "BTS",
    airport: "Bratislava Airport",
  },
  {
    city: "Bremen",
    iata: "BRE",
    airport: "Bremen Airport",
  },
  {
    city: "Bristol",
    iata: "BRS",
    airport: "Bristol Airport",
  },
  {
    city: "Brussels",
    iata: "BRU",
    airport: "Brussels Airport",
  },
  {
    city: "Brussels (Charleroi)",
    iata: "CRL",
    airport: "Brussels South Charleroi Airport",
  },
  {
    city: "Bucharest (Băneasa)",
    iata: "BBU",
    airport: "Aurel Vlaicu International Airport",
  },
  {
    city: "Bucharest (Otopeni)",
    iata: "OTP",
    airport: "Henri Coandă International Airport",
  },
  {
    city: "Budapest",
    iata: "BUD",
    airport: "Budapest Ferenc Liszt International Airport",
  },
  {
    city: "Burgas",
    iata: "BOJ",
    airport: "Burgas Airport",
  },
  {
    city: "Cagliari",
    iata: "CAG",
    airport: "Cagliari Elmas Airport",
  },
  {
    city: "Cairo",
    iata: "CAI",
    airport: "Cairo International Airport",
  },
  {
    city: "Casablanca",
    iata: "CMN",
    airport: "Mohammed V International Airport",
  },
  {
    city: "Castellon de la Plana",
    iata: "CDT",
    airport: "Castellón–Costa Azahar Airport",
  },
  {
    city: "Catania",
    iata: "CTA",
    airport: "Catania–Fontanarossa Airport",
  },
  {
    city: "Chania",
    iata: "CHQ",
    airport: "Chania International Airport",
  },
  {
    city: "Chicago",
    iata: "ORD",
    airport: "Chicago O'Hare International Airport",
  },
  {
    city: "Chisinau",
    iata: "RMO",
    airport: "Chișinău International Airport",
  },
  {
    city: "Chongqing",
    iata: "CKG",
    airport: "Chongqing Jiangbei International Airport",
  },
  {
    city: "Cluj-Napoca",
    iata: "CLJ",
    airport: "Avram Iancu Cluj International Airport",
  },
  {
    city: "Cologne",
    iata: "CGN",
    airport: "Cologne Bonn Airport",
  },
  {
    city: "Copenhagen",
    iata: "CPH",
    airport: "Copenhagen Airport",
  },
  {
    city: "Corfu",
    iata: "CFU",
    airport: "Corfu International Airport",
  },
  {
    city: "Cork",
    iata: "ORK",
    airport: "Cork Airport",
  },
  {
    city: "Dalaman",
    iata: "DLM",
    airport: "Dalaman Airport",
  },
  {
    city: "Doha",
    iata: "DOH",
    airport: "Hamad International Airport",
  },
  {
    city: "Dortmund",
    iata: "DTM",
    airport: "Dortmund Airport",
  },
  {
    city: "Dubai",
    iata: "DXB",
    airport: "Dubai International Airport",
  },
  {
    city: "Dublin",
    iata: "DUB",
    airport: "Dublin Airport",
  },
  {
    city: "Dubrovnik",
    iata: "DBV",
    airport: "Dubrovnik Ruđer Bošković Airport",
  },
  {
    city: "Dusseldorf",
    iata: "DUS",
    airport: "Düsseldorf Airport",
  },
  {
    city: "Edinburgh",
    iata: "EDI",
    airport: "Edinburgh Airport",
  },
  {
    city: "Eindhoven",
    iata: "EIN",
    airport: "Eindhoven Airport",
  },
  {
    city: "Faro",
    iata: "FAO",
    airport: "Faro Airport",
  },
  {
    city: "Fertilia",
    iata: "AHO",
    airport: "Alghero–Fertilia Airport",
  },
  {
    city: "Florence",
    iata: "FLR",
    airport: "Florence Airport, Peretola",
  },
  {
    city: "Frankfurt",
    iata: "FRA",
    airport: "Frankfurt Airport",
  },
  {
    city: "Fuerteventura",
    iata: "FUE",
    airport: "Fuerteventura Airport",
  },
  {
    city: "Funchal",
    iata: "FNC",
    airport: "Madeira Cristiano Ronaldo Airport",
  },
  {
    city: "Gdansk",
    iata: "GDN",
    airport: "Gdańsk Lech Wałęsa Airport",
  },
  {
    city: "Geneva",
    iata: "GVA",
    airport: "Geneva Airport",
  },
  {
    city: "Genoa",
    iata: "GOA",
    airport: "Genoa Cristoforo Colombo Airport",
  },
  {
    city: "Giza",
    iata: "SPX",
    airport: "Sphinx International Airport",
  },
  {
    city: "Glasgow",
    iata: "GLA",
    airport: "Glasgow Airport",
  },
  {
    city: "Gothenburg",
    iata: "GOT",
    airport: "Göteborg Landvetter Airport",
  },
  {
    city: "Gran Canaria",
    iata: "LPA",
    airport: "Gran Canaria Airport",
  },
  {
    city: "Guangzhou",
    iata: "CAN",
    airport: "Guangzhou Baiyun International Airport",
  },
  {
    city: "Hahn",
    iata: "HHN",
    airport: "Frankfurt–Hahn Airport",
  },
  {
    city: "Hamburg",
    iata: "HAM",
    airport: "Hamburg Airport",
  },
  {
    city: "Hanover",
    iata: "HAJ",
    airport: "Hannover Airport",
  },
  {
    city: "Helsinki",
    iata: "HEL",
    airport: "Helsinki Airport",
  },
  {
    city: "Heraklion",
    iata: "HER",
    airport: "Heraklion International Airport",
  },
  {
    city: "Hong Kong",
    iata: "HKG",
    airport: "Hong Kong International Airport",
  },
  {
    city: "Hurghada",
    iata: "HRG",
    airport: "Hurghada International Airport",
  },
  {
    city: "Iasi",
    iata: "IAS",
    airport: "Iași International Airport",
  },
  {
    city: "Ibiza",
    iata: "IBZ",
    airport: "Ibiza Airport",
  },
  {
    city: "Istanbul (IST)",
    iata: "IST",
    airport: "Istanbul Airport",
  },
  {
    city: "Istanbul (Sabiha Gökçen)",
    iata: "SAW",
    airport: "Sabiha Gökçen International Airport",
  },
  {
    city: "Izmir",
    iata: "ADB",
    airport: "Izmir Adnan Menderes Airport",
  },
  {
    city: "Jeddah",
    iata: "JED",
    airport: "King Abdulaziz International Airport",
  },
  {
    city: "Katowice",
    iata: "KTW",
    airport: "Katowice Airport",
  },
  {
    city: "Keflavik",
    iata: "KEF",
    airport: "Keflavík International Airport",
  },
  {
    city: "Kraków",
    iata: "KRK",
    airport: "John Paul II Kraków Balice International Airport",
  },
  {
    city: "Kuala Lumpur",
    iata: "KUL",
    airport: "Kuala Lumpur International Airport",
  },
  {
    city: "Kutaisi",
    iata: "KUT",
    airport: "David the Builder Kutaisi International Airport",
  },
  {
    city: "Lamezia Terme",
    iata: "SUF",
    airport: "Lamezia Terme International Airport",
  },
  {
    city: "Lanzarote",
    iata: "ACE",
    airport: "César Manrique–Lanzarote Airport",
  },
  {
    city: "Larnaca",
    iata: "LCA",
    airport: "Larnaca International Airport",
  },
  {
    city: "Leipzig",
    iata: "LEJ",
    airport: "Leipzig/Halle Airport",
  },
  {
    city: "Lisbon",
    iata: "LIS",
    airport: "Humberto Delgado Airport",
  },
  {
    city: "Liverpool",
    iata: "LPL",
    airport: "Liverpool John Lennon Airport",
  },
  {
    city: "London",
    iata: "LON",
    airport: "London Metropolitan Area (Multiple Airports)",
  },
  {
    city: "London (City)",
    iata: "LCY",
    airport: "London City Airport",
  },
  {
    city: "London (Gatwick)",
    iata: "LGW",
    airport: "London Gatwick Airport",
  },
  {
    city: "London (Heathrow)",
    iata: "LHR",
    airport: "London Heathrow Airport",
  },
  {
    city: "London (Luton)",
    iata: "LTN",
    airport: "London Luton Airport",
  },
  {
    city: "London (Stansted)",
    iata: "STN",
    airport: "London Stansted Airport",
  },
  {
    city: "Los Angeles",
    iata: "LAX",
    airport: "Los Angeles International Airport",
  },
  {
    city: "Luxembourg City",
    iata: "LUX",
    airport: "Luxembourg Airport",
  },
  {
    city: "Lyon",
    iata: "LYS",
    airport: "Lyon–Saint Exupéry Airport",
  },
  {
    city: "Madrid (Barajas)",
    iata: "MAD",
    airport: "Adolfo Suárez Madrid–Barajas Airport",
  },
  {
    city: "Malaga",
    iata: "AGP",
    airport: "Málaga–Costa del Sol Airport",
  },
  {
    city: "Malta",
    iata: "MLA",
    airport: "Malta International Airport",
  },
  {
    city: "Manchester",
    iata: "MAN",
    airport: "Manchester Airport",
  },
  {
    city: "Marrakech",
    iata: "RAK",
    airport: "Marrakesh Menara Airport",
  },
  {
    city: "Marseille",
    iata: "MRS",
    airport: "Marseille Provence Airport",
  },
  {
    city: "Memmingen",
    iata: "FMM",
    airport: "Memmingen Airport",
  },
  {
    city: "Menorca",
    iata: "MAH",
    airport: "Menorca Airport",
  },
  {
    city: "Miami",
    iata: "MIA",
    airport: "Miami International Airport",
  },
  {
    city: "Milan (Linate)",
    iata: "LIN",
    airport: "Milan Linate Airport",
  },
  {
    city: "Milan (Malpensa)",
    iata: "MXP",
    airport: "Milan Malpensa Airport",
  },
  {
    city: "Montreal",
    iata: "YUL",
    airport: "Montréal–Trudeau International Airport",
  },
  {
    city: "Munich",
    iata: "MUC",
    airport: "Munich Airport",
  },
  {
    city: "Muscat",
    iata: "MCT",
    airport: "Muscat International Airport",
  },
  {
    city: "Mykonos",
    iata: "JMK",
    airport: "Mykonos International Airport",
  },
  {
    city: "Nantes",
    iata: "NTE",
    airport: "Nantes Atlantique Airport",
  },
  {
    city: "Naples",
    iata: "NAP",
    airport: "Naples International Airport",
  },
  {
    city: "New York (JFK)",
    iata: "JFK",
    airport: "John F. Kennedy International Airport",
  },
  {
    city: "New York (Newark)",
    iata: "EWR",
    airport: "Newark Liberty International Airport",
  },
  {
    city: "Newcastle",
    iata: "NCL",
    airport: "Newcastle International Airport",
  },
  {
    city: "Nice",
    iata: "NCE",
    airport: "Nice Côte d'Azur Airport",
  },
  {
    city: "Ningbo",
    iata: "NGB",
    airport: "Ningbo Lishe International Airport",
  },
  {
    city: "Nuremberg",
    iata: "NUE",
    airport: "Nuremberg Airport",
  },
  {
    city: "Olbia",
    iata: "OLB",
    airport: "Olbia Costa Smeralda Airport",
  },
  {
    city: "Osaka",
    iata: "KIX",
    airport: "Kansai International Airport",
  },
  {
    city: "Oslo",
    iata: "OSL",
    airport: "Oslo Airport, Gardermoen",
  },
  {
    city: "Palermo",
    iata: "PMO",
    airport: "Falcone–Borsellino Airport",
  },
  {
    city: "Palma de Mallorca",
    iata: "PMI",
    airport: "Palma de Mallorca Airport",
  },
  {
    city: "Paphos",
    iata: "PFO",
    airport: "Paphos International Airport",
  },
  {
    city: "Paris (Beauvais)",
    iata: "BVA",
    airport: "Paris Beauvais–Tillé Airport",
  },
  {
    city: "Paris (Charles de Gaulle)",
    iata: "CDG",
    airport: "Paris Charles de Gaulle Airport",
  },
  {
    city: "Paris (Orly)",
    iata: "ORY",
    airport: "Paris Orly Airport",
  },
  {
    city: "Pisa",
    iata: "PSA",
    airport: "Pisa International Airport",
  },
  {
    city: "Podgorica",
    iata: "TGD",
    airport: "Podgorica Airport",
  },
  {
    city: "Porto",
    iata: "OPO",
    airport: "Francisco Sá Carneiro Airport",
  },
  {
    city: "Poznan",
    iata: "POZ",
    airport: "Poznań–Ławica Airport",
  },
  {
    city: "Prague",
    iata: "PRG",
    airport: "Václav Havel Airport Prague",
  },
  {
    city: "Preveza",
    iata: "PVK",
    airport: "Aktion National Airport",
  },
  {
    city: "Rhodes",
    iata: "RHO",
    airport: "Rhodes International Airport",
  },
  {
    city: "Riga",
    iata: "RIX",
    airport: "Riga International Airport",
  },
  {
    city: "Rimini",
    iata: "RMI",
    airport: "Federico Fellini International Airport",
  },
  {
    city: "Rome (Ciampino)",
    iata: "CIA",
    airport: "Rome Ciampino Airport",
  },
  {
    city: "Rome (Fiumicino)",
    iata: "FCO",
    airport: "Leonardo da Vinci–Fiumicino Airport",
  },
  {
    city: "Salalah",
    iata: "SLL",
    airport: "Salalah Airport",
  },
  {
    city: "San Francisco",
    iata: "SFO",
    airport: "San Francisco International Airport",
  },
  {
    city: "Santorini",
    iata: "JTR",
    airport: "Santorini International Airport",
  },
  {
    city: "Seoul",
    iata: "ICN",
    airport: "Incheon International Airport",
  },
  {
    city: "Seville",
    iata: "SVQ",
    airport: "Seville Airport",
  },
  {
    city: "Shanghai",
    iata: "PVG",
    airport: "Shanghai Pudong International Airport",
  },
  {
    city: "Shannon",
    iata: "SNN",
    airport: "Shannon Airport",
  },
  {
    city: "Sharm El Sheikh",
    iata: "SSH",
    airport: "Sharm El Sheikh International Airport",
  },
  {
    city: "Shenzhen",
    iata: "SZX",
    airport: "Shenzhen Bao'an International Airport",
  },
  {
    city: "Shymkent",
    iata: "CIT",
    airport: "Shymkent International Airport",
  },
  {
    city: "Singapore",
    iata: "SIN",
    airport: "Singapore Changi Airport",
  },
  {
    city: "Skiathos",
    iata: "JSI",
    airport: "Skiathos Island National Airport",
  },
  {
    city: "Skopje",
    iata: "SKP",
    airport: "Skopje International Airport",
  },
  {
    city: "Sofia",
    iata: "SOF",
    airport: "Sofia Airport",
  },
  {
    city: "Split",
    iata: "SPU",
    airport: "Split Airport",
  },
  {
    city: "Stockholm",
    iata: "ARN",
    airport: "Stockholm Arlanda Airport",
  },
  {
    city: "Stuttgart",
    iata: "STR",
    airport: "Stuttgart Airport",
  },
  {
    city: "Tallinn",
    iata: "TLL",
    airport: "Tallinn Airport",
  },
  {
    city: "Targu Mures",
    iata: "TGM",
    airport: "Târgu Mureș International Airport",
  },
  {
    city: "Tbilisi",
    iata: "TBS",
    airport: "Tbilisi International Airport",
  },
  {
    city: "Tel Aviv",
    iata: "TLV",
    airport: "Ben Gurion Airport",
  },
  {
    city: "Tenerife",
    iata: "TFS",
    airport: "Tenerife South Airport",
  },
  {
    city: "Thessaloniki",
    iata: "SKG",
    airport: "Thessaloniki Airport Makedonia",
  },
  {
    city: "Tirana",
    iata: "TIA",
    airport: "Tirana International Airport Nënë Tereza",
  },
  {
    city: "Tokyo (Haneda)",
    iata: "HND",
    airport: "Tokyo Haneda Airport",
  },
  {
    city: "Tokyo (Narita)",
    iata: "NRT",
    airport: "Narita International Airport",
  },
  {
    city: "Toronto",
    iata: "YYZ",
    airport: "Toronto Pearson International Airport",
  },
  {
    city: "Toulouse",
    iata: "TLS",
    airport: "Toulouse–Blagnac Airport",
  },
  {
    city: "Treviso",
    iata: "TSF",
    airport: "Treviso Airport",
  },
  {
    city: "Tunis",
    iata: "TUN",
    airport: "Tunis–Carthage International Airport",
  },
  {
    city: "Turin",
    iata: "TRN",
    airport: "Turin Airport",
  },
  {
    city: "Valencia",
    iata: "VLC",
    airport: "Valencia Airport",
  },
  {
    city: "Vancouver",
    iata: "YVR",
    airport: "Vancouver International Airport",
  },
  {
    city: "Venice",
    iata: "VCE",
    airport: "Venice Marco Polo Airport",
  },
  {
    city: "Verona",
    iata: "VRN",
    airport: "Verona Villafranca Airport",
  },
  {
    city: "Vienna",
    iata: "VIE",
    airport: "Vienna International Airport",
  },
  {
    city: "Vilnius",
    iata: "VNO",
    airport: "Vilnius Airport",
  },
  {
    city: "Warsaw",
    iata: "WAW",
    airport: "Warsaw Chopin Airport",
  },
  {
    city: "Warsaw (Modlin)",
    iata: "WMI",
    airport: "Warsaw Modlin Airport",
  },
  {
    city: "Washington, D.C.",
    iata: "IAD",
    airport: "Washington Dulles International Airport",
  },
  {
    city: "Wroclaw",
    iata: "WRO",
    airport: "Wrocław Airport",
  },
  {
    city: "Xi'an",
    iata: "XIY",
    airport: "Xi'an Xianyang International Airport",
  },
  {
    city: "Yerevan",
    iata: "EVN",
    airport: "Zvartnots International Airport",
  },
  {
    city: "Zadar",
    iata: "ZAD",
    airport: "Zadar Airport",
  },
  {
    city: "Zagreb",
    iata: "ZAG",
    airport: "Franjo Tuđman Airport",
  },
  {
    city: "Zakynthos",
    iata: "ZTH",
    airport: "Zakynthos International Airport",
  },
  {
    city: "Zurich",
    iata: "ZRH",
    airport: "Zurich Airport",
  },
];

module.exports = cities;

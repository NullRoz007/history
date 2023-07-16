const phrases = require("./texts/phrases.json");

// World dimensions
const width = 100;
const height = 50;

// Define races
const races = [
	{ name: "Race A", members: 2, hostility: 0.7, climatePreference: 0.8 },
	{ name: "Race B", members: 2, hostility: 0.5, climatePreference: 0.3 },
	{ name: "Race C", members: 2, hostility: 0.7, climatePreference: 0.8 },
	{ name: "Race D", members: 2, hostility: 0.5, climatePreference: 0.3 },
    { name: "Race E", members: 2, hostility: 0.5, climatePreference: 0.3 },
    { name: "Race F", members: 2, hostility: 0.5, climatePreference: 0.3 },
    { name: "Race G", members: 2, hostility: 0.5, climatePreference: 0.3 },
	// Add more races...
];

// Initialize world grid with resources
const world = [];
for (let y = 0; y < height; y++) {
	world[y] = [];
	for (let x = 0; x < width; x++) {
		world[y][x] = {
			race: null,
			structure: null,
			resources: {
				water: Math.floor(Math.random() * 10000) + 1,
				food: Math.floor(Math.random() * 10000) + 1
			},
			x: x,
			y: y
		};
	}
}

// Generate random locations for races
for (const race of races) {
	const x = Math.floor(Math.random() * width);
	const y = Math.floor(Math.random() * height);
	world[y][x].race = race;
    console.log(race.name + " starting location: " +x + ", "+y);
}

// Simulate history
const history = [];

function simulateHistory(iterations) {
	for (let i = 0; i < iterations; i++) {
		// Perform simulation steps here
		// You can iterate over the world grid and update the state of races, structures, etc.
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const cell = world[y][x];
				const race = cell.race;

				if (race) {
					// Gather resources
					const resources = gatherResources(x, y);

					// Calculate birth and death rates based on resources
					const { birthRate, deathRate } = calculateRates(resources, race.members);

					// Update population based on birth and death rates
					const birthCount = Math.ceil(birthRate * race.members);
					race.members += birthCount;

					const deathCount = Math.floor(deathRate * race.members);
					race.members -= deathCount;

					var food = (resources.food - race.members);
					var water = resources.water - race.members;


                    if(cell.structure == true) {
                        food += race.members;
                        water += race.members;
                    }

					const updated_resources = {
						water: clamp(water, 0, 10000),
						food: clamp(food, 0, 10000)
					};

					world[y][x].resources = updated_resources;

					if (race.members <= 0) {
						world[y][x].race = null;

						const event = {
							iteration: i,
							race: race.name,
							action: race.name + " perished. ", // Replace with appropriate action
							location: { x, y },
							resources,
							population: race.members,
							isGoodEvent: false
						};

						history.push(event);
						continue;
					}

					const expandProbability = calculateExpandProbability(resources, birthRate, deathRate);
					const bExpand= decideExpand(expandProbability);
					if (bExpand && !cell.structure) {
						const event = {
							iteration: i,
							race: race.name,
							action: race.name + " built a structure.", // Replace with appropriate action
							location: { x, y },
							resources,
							population: race.members,
							isGoodEvent: true
						};
						world[y][x].structure = true;
						history.push(event);
					} else if(cell.structure) {
                        candidates = getNeighboringCells(x, y);
						candidates.sort((c_a, c_b) => {
							const a_r = c_a.resources.food + c_a.resources.water;
							const b_r = c_b.resources.food + c_b.resources.water;
							return b_r - a_r;
						});

						for(let i = 0; i < candidates.length; i++) {
                            const destination = candidates[i];
                            if(!destination.race) {
                                const dx = destination.x;
                                const dy = destination.y;
                                
                                const event = {
                                    iteration: i,
                                    race: race.name,
                                    action: race.name + " expanded into "+dx+","+dy, // Replace with appropriate action
                                    location: { x, y },
                                    resources,
                                    population: race.members,
                                    isGoodEvent: true
                                };

                                const to_move = 1 + Math.sin(race.population / 10);

                                world[y][x].race.population -= to_move;
                                world[dy][dx].race = race;
                                world[dy][dx].race.population = to_move;
                                history.push(event);

                                break;
                            }
                        }
                    }

					// Implement other logic for each race
					// e.g., building structures, expanding, etc.

					// Record important events in history
				}
			}
		}
	}

	// Output history
	//console.log(history);
	return history;
	//printWorldState();
}

// Helper function to calculate birth and death rates based on resources and population size
function calculateRates(resources, population) {
	let birthRate = 0.01; // Default birth rate
	let deathRate = 0.01; // Default death rate

	// Adjust birth and death rates based on resource availability
	const foodAvailability = Math.max(resources.food / 100, 0); // Ensure food availability is between 0 and 1
	const waterAvailability = Math.max(resources.water / 100, 0); // Ensure water availability is between 0 and 1

	// Modify birth and death rates based on resource availability and population size
	if (population > 1) {
		birthRate += 0.02 * foodAvailability; // Increase birth rate with higher food availability
		birthRate += 0.01 * waterAvailability; // Increase birth rate with higher water availability
	} else {
		birthRate = 0; // Set birth rate to 0 for population size 1
	}

	deathRate += 0.007 * (1 - foodAvailability); // Increase death rate with lower food availability
	deathRate += 0.005 * (1 - waterAvailability); // Increase death rate with lower water availability

	deathRate = Math.abs(deathRate);

	return { birthRate, deathRate };
}

/**
* resourceLevel: the sum of resource units in a cell,
* race:          the race for which to calculate migration probability
**/
function calculateMigrationProbability(resourceLevel, race) {
	const threshold = race.members;

	// Calculate the migration probability based on resource level
	if (resourceLevel <= threshold) {
		// If resource level is below or equal to the threshold, increase migration probability
		return 1 - resourceLevel / threshold;
	} else {
		// If resource level is above the threshold, migration probability is 0
		return 0;
	}
}

function calculateStructureProbability(resources, birthRate, deathRate) {
	const stability = birthRate - deathRate;
	const resourceAvailability = Math.max(((resources.food + resources.water) / 2) / 100, 0);

	// Adjust the weightings based on your desired balance between stability and resource availability
	const stabilityWeight = 0.6;
	const resourceWeight = 0.4;

	// Combine stability and resource availability to calculate the structure probability
	const structureProbability = stabilityWeight * stability + resourceWeight * resourceAvailability;

	return structureProbability / 100;
}

function decideBuildStructure(structureProbability) {
	const threshold = 0.8; // Adjust this threshold to make it less likely

	// Generate a random number between 0 and 1
	const random = Math.random();

	// Check if the random number is less than the lower threshold for building a structure
	if (random <= threshold * structureProbability) {
		// Build a structure
		return true;
	} else {
		// Do not build a structure
		return false;
	}
}

function calculateExpandProbability(resources, birthRate, deathRate) {
	const stability = birthRate - deathRate;
	const resourceAvailability = Math.max(((resources.food + resources.water) / 2) / 100, 0);

	// Adjust the weightings based on your desired balance between stability and resource availability
	const stabilityWeight = 0.6;
	const resourceWeight = 0.4;

	// Combine stability and resource availability to calculate the structure probability
	const structureProbability = stabilityWeight * stability + resourceWeight * resourceAvailability;

	return structureProbability / 100;
}

function decideExpand(expandProbability) {
	const threshold = 0.8; // Adjust this threshold to make it less likely

	// Generate a random number between 0 and 1
	const random = Math.random();

	// Check if the random number is less than the lower threshold for building a structure
	if (random <= threshold * expandProbability) {
		// Build a structure
		return true;
	} else {
		// Do not build a structure
		return false;
	}
}

function decideMigration(migrationProbability) {
	// Generate a random number between 0 and 1
	const random = Math.random();

	// Check if the random number is less than or equal to the migration probability
	if (random <= migrationProbability) {
		// Migrate to a neighboring cell
		return true;
	} else {
		// Stay in the current cell
		return false;
	}
}

// Helper function to simulate resource gathering for a specific cell
function gatherResources(x, y) {
	// Retrieve resources from the specified cell
	const cell = world[y][x];
	const resources = { ...cell.resources };

	return resources;
}

// Helper function to get neighboring cells for a given cell
function getNeighboringCells(x, y) {
	const neighboringCells = [];

	// Define the relative positions of neighboring cells
	const neighborsOffsets = [
		{ dx: -1, dy: -1 }, // Top-left
		{ dx: 0, dy: -1 },  // Top
		{ dx: 1, dy: -1 },  // Top-right
		{ dx: -1, dy: 0 },  // Left
		{ dx: 1, dy: 0 },   // Right
		{ dx: -1, dy: 1 },  // Bottom-left
		{ dx: 0, dy: 1 },   // Bottom
		{ dx: 1, dy: 1 },   // Bottom-right
	];

	// Iterate over the neighbor offsets and calculate the coordinates of neighboring cells
	for (const offset of neighborsOffsets) {
		const neighborX = x + offset.dx;
		const neighborY = y + offset.dy;

		// Check if the neighboring cell is within the world grid boundaries
		if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
			if(neighborX != x || neighborY != y) neighboringCells.push(world[neighborY][neighborX]);
		}
	}

	return neighboringCells;
}

function printWorldState() {
	var races = {};
	console.clear();

	for (let y = 0; y < height; y++) {
		let row = '';
		for (let x = 0; x < width; x++) {
			const cell = world[y][x];
			const r = cell.race ? cell.race.name : '-';

			if (cell.race) {
				races[cell.race.name] = cell.race;
			}

			row += `[${r}]`;
		}
		console.log(row);
	}

	console.log(races);
}

// Helper function to clamp two values
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

// Generate a randomly phrased history entry for each event
function generateRandomHistoryText(events) {
	let text = "A Chronicle of the World's History\n\n";

	for (const event of events) {
		const { iteration, race, action, location, resources, population, isGoodEvent } = event;

		text += `Iteration ${iteration}\n`;
		text += `The Year is ${iteration}, ${race} ${generateRandomPhrase(action, isGoodEvent)}\n`;
		text += generateRandomBackground(location);
		text += generateRandomAchievements(population);
		text += generateRandomResources(resources, isGoodEvent);
		text += "\n";
	}

	text += "And so the world's history continued...";

	return text;
}

function generateHistoryByIteration(events) {
	let history = {}; //history dictionary, iteration number as key
	for (const event of events) {
		const { iteration, race, action, location, resources, population, isGoodEvent } = event;
		const key = iteration;

		if (!history[key]) { history[key] = {}; }

		if (history[key].hasOwnProperty("events")) {
			history[key].events.push(event);
		} else {
			history[key]['events'] = [event];
		}
	}

	return history;
}

const generateHistoryByKey = (events, keyFunc) => {
	let history = {}; //history dictionary, iteration number as key
	for (const event of events) {
		const { iteration, race, action, location, resources, population, isGoodEvent } = event;
		const key = keyFunc(event);

		if (!history[key]) { history[key] = {}; }

		if (history[key].hasOwnProperty("events")) {
			history[key].events.push(event);
		} else {
			history[key]['events'] = [event];
		}
	}

	return history;
}

// Generate a random phrase for the action
function generateRandomPhrase(action, isGoodEvent) {
	const positivePhrases = phrases.positivePhrases;

	const negativePhrases = phrases.negativePhrases;

	const randomPhrase = isGoodEvent
		? positivePhrases[Math.floor(Math.random() * positivePhrases.length)]
		: negativePhrases[Math.floor(Math.random() * negativePhrases.length)];

	return `${randomPhrase} ${action}`;
}

// Generate a random background description based on the location
function generateRandomBackground(location) {
	const backgrounds = [
		"Nestled in the heart of the land,",
		"Within the vast expanse of the realm,",
		"Amidst the awe-inspiring landscapes of",
		"In a realm where dreams intertwine with reality,",
		"Beneath the watchful gaze of nature's grandeur,"
	];

	const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
	const coordinates = location.x ? `(${location.x}, ${location.y})` : `(${location.dx}, ${location.dy})`;

	return `${randomBackground} the settlers found solace at coordinates ${coordinates}.\n`;
}

// Generate a random description of the achievements based on population
function generateRandomAchievements(population) {
	const positiveAchievements = [
		"The population flourished, as dreams turned into realities and ambitions knew no bounds.",
		"Their numbers swelled, fueling the fires of progress and sparking waves of innovation.",
		"Great works were undertaken, harnessing the collective strength of their thriving community."
	];

	const negativeAchievements = [
		"However, their population dwindled, casting a shadow over the land and leaving behind remnants of their once-vibrant society.",
		"Yet, adversity loomed large, dampening their spirits and pushing them to the brink of extinction.",
		"With their numbers waning, they clung to hope, cherishing the memories of a glorious past."
	];

	const randomAchievement = population >= 0
		? positiveAchievements[Math.floor(Math.random() * positiveAchievements.length)]
		: negativeAchievements[Math.floor(Math.random() * negativeAchievements.length)];

	return `${randomAchievement}\n`;
}

// Generate a random description of the resources
function generateRandomResources(resources, isGoodEvent) {
	const goodWaterDescriptions = [
		"Water flowed abundantly, quenching their thirst and nurturing their flourishing civilization.",
		"Rivers meandered through the land, offering a lifeline to the settlements and their thriving inhabitants.",
		"Springs emerged from the depths, providing a source of sustenance and captivating the souls of the settlers."
	];

	const goodFoodDescriptions = [
		"The bountiful harvests painted a tapestry of abundance, ensuring their tables were filled with the fruits of their labor.",
		"Fertile soils yielded treasures aplenty, bestowing upon them the gift of sustenance and prosperity.",
		"Fields stretched far and wide, teeming with life and ushering in an era of plenty."
	];

	const badWaterDescriptions = [
		"Water grew scarce, forcing them to adapt and conserve every precious drop.",
		"Rivers ran dry, leaving behind arid landscapes and parched hearts.",
		"The absence of water whispered tales of longing and survival, as their resilience was tested."
	];

	const badFoodDescriptions = [
		"Famines plagued their land, casting a dark shadow upon their aspirations.",
		"Harvests faltered, bringing forth lean times and challenging their fortitude.",
		"Fields withered under the weight of adversity, as they valiantly persevered against the odds."
	];

	const waterDescriptions = isGoodEvent ? goodWaterDescriptions : badWaterDescriptions;
	const foodDescriptions = isGoodEvent ? goodFoodDescriptions : badFoodDescriptions;

	const randomWaterDescription = waterDescriptions[Math.floor(Math.random() * waterDescriptions.length)];
	const randomFoodDescription = foodDescriptions[Math.floor(Math.random() * foodDescriptions.length)];

	return `${randomWaterDescription} ${randomFoodDescription}\n`;
}

module.exports = {
    simulate: simulateHistory,
    generateHT: generateHistoryByKey,
    currentHistory: function() { return history; }
}

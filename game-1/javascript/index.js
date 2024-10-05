import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

let memory = {
  mode: "result",
  buttons: [],
  startPoint: 0,
  moves: 0,
  pathes: {},
  debug: true,
};

/**
 *
 * @param {String} from
 * @param {String} action
 */
async function worker(from, action) {
  let [doing, sizing, to] = action.split(" ");
  let result = from;
  switch (doing) {
    case "+":
      result = "" + (parseInt(result) + parseInt(sizing));
      break;
    case "-":
      result = "" + (parseInt(result) - parseInt(sizing));
      break;
    case "*":
    case "x":
      result = "" + parseInt(result) * parseInt(sizing);
      break;
    case "/":
      if (sizing === "0" || parseInt(result) % parseInt(sizing) !== 0)
        return false;
      result = "" + parseInt(result) / parseInt(sizing);
      break;
    case "+/-":
      result = result[0] === "-" ? result.substring(1) : `-${result}`;
      break;
    case "<<":
      if (result.length === 1) result = "0";
      else result = result.substring(0, result.length - 1);
      break;
    case "reverse":
      result = Array.from(result).reverse().join("");
      break;
    case "sum":
      result =
        (result[0] === "-" ? "-" : "") +
        Array.from(result[0] === "-" ? result.substring(1) : result)
          .map((e) => parseInt(e))
          .reduce((pv, c) => pv + parseInt(c), 0);
      break;
    default:
      if (sizing === "=>") {
        let search = new RegExp(`${doing}`, "g");
        result = result.replace(search, to);
        break;
      } else if (sizing === undefined) {
        result += "" + doing;
        break;
      }
      return false;
  }
  return "" + parseInt(result);
}
function generateButtonCalls() {
  let result = [];

  function generate(currentCombo, depth) {
    if (depth > 0) {
      result.push(currentCombo);
    }
    if (depth === memory.moves) {
      return;
    }
    for (let i = 0; i < memory.buttons.length; i++) {
      generate(currentCombo.concat(memory.buttons[i]), depth + 1);
    }
  }

  generate([], 0);

  return result;
}

async function compute() {
  let calls = generateButtonCalls();

  // Parallelize processing of calls
  await Promise.all(
    calls.map(async (actions) => {
      let stp = memory.startPoint;

      // Process each action in sequence
      for (let act of actions) {
        stp = await worker(stp, act);
        if (stp === false) return; // Stop if worker returns false (invalid operation)
      }

      // Optimize pathes storage
      if (!memory.pathes[stp]) {
        memory.pathes[stp] = [];
      }

      memory.pathes[stp].push(actions.join(" ===> "));
    })
  );
}

function printArray(array) {
  for (let el of array) console.log(el);
}
function printAsSystem(input, asReturn) {
  if (asReturn) return "[System]: " + input;
  console.log("[System]: " + input);
}
async function waitForInput() {
  return await rl.question("> ");
}

(async () => {
  printArray([
    "Welcome to Calculator The Game Solver!",
    "To use this util you must remember next things:",
    "",
    "1. To submit entered buttons (exit from Button Input) type [END] (with brackets)",
    "2. When you want to resubmit buttons type [NEW] to enter Button Input mode (This will erase all previous input)",
    "3. To get actual `Result Size` for all results type [SIZE]",
    "4. To get actual `Result Size` for desired result type [RESSIZE]",
    "5. Input [QUIT] to fully close application",
    "",
    "Have Fun!",
    printAsSystem("Now you are in Result mode.", true),
  ]);

  while (true) {
    let input = (await waitForInput()).toLowerCase();
    if (input === "[new]") {
      printAsSystem(
        "Now you are in Button Mode. Warning: All previous data is destroyed!"
      );
      memory.buttons = [];
      memory.mode = "buttons";
      memory.moves = 0;
      memory.pathes = {};
      memory.startPoint = "0";
      continue;
    }
    if (input === "[end]") {
      memory.mode = "result";
      printAsSystem("You are going back to Result mode!");
      printAsSystem("Please input Start Point (from what we start)");
      memory.startPoint = "" + (await waitForInput());
      printAsSystem("Now please input moves amount available");
      memory.moves = parseInt(await waitForInput());
      printAsSystem("Please wait untill everything is computated.");
      await compute();
      printAsSystem(
        "Everything computated. You are free to ask for desired result"
      );
      continue;
    }
    if (input === "[size]") {
      printAsSystem(
        `Founded ${Object.keys(memory.pathes).length} possible results`
      );
      continue;
    }
    if (input === "[results]") {
      console.log(memory.pathes);
      continue;
    }
    if (input === "[ressize]") {
      printAsSystem(`Please input result you want to check:`);
      let res = await waitForInput();
      printAsSystem(
        `Founded ${memory.pathes["" + res].length} possible results for ${res}`
      );
      continue;
    }
    if (input === "[quit]") {
      printAsSystem("Goodbye!");
      break;
    }

    /// ===== Button mode filter =====

    if (memory.mode === "buttons") {
      let elm = input.split(" ");

      if (
        elm.length === 1 &&
        (["reverse", "+/-", "<<", "sum"].includes(elm[0]) ||
          /^[0-9]+$/.test(elm[0]))
      ) {
        memory.buttons.push(input);
      } else if (
        elm.length === 2 &&
        ["+", "-", "*", "x", "/"].includes(elm[0]) &&
        /^-?[0-9]+$/.test(elm[1])
      ) {
        memory.buttons.push(input);
      } else if (
        elm.length === 3 &&
        elm[1] === "=>" &&
        /^[0-9]+$/.test(elm[0]) &&
        /^[0-9]+$/.test(elm[2])
      ) {
        memory.buttons.push(input);
      } else {
        printAsSystem(
          "Wrong input. Please check if the button is inputted correctly."
        );
      }
    }

    if (memory.mode === "result") {
      if (Object.keys(memory.pathes).includes(input)) {
        printAsSystem(
          "Founded those first available solutions (max 5) for current result:"
        );
        printArray(memory.pathes[input].slice(0, 5));
      } else {
        printAsSystem(
          "Cannot found any suitable solutions for current result."
        );
      }
    }
  }
  rl.close();
})();

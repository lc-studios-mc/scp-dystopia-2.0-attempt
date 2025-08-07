import { isAirOrLiquid } from "@lib/utils/blockUtils";
import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

type UpOrDown = "none" | "up" | "down";

type PlacementOptions = {
	text: string;
	spacing: number;
	color: "white" | "black";
};

type PlacementSequenceElement = mc.BlockPermutation | "space";

const showPlacementOptionsForm = async (
	player: mc.Player,
): Promise<PlacementOptions | undefined> => {
	const response = await new ModalFormData()
		.title({ translate: "scpdy.form.alphanumericSignOptions.title" })
		.textField(
			{ translate: "scpdy.form.alphanumericSignOptions.textField.label" },
			{ translate: "scpdy.form.alphanumericSignOptions.textField.placeholder" },
			{ defaultValue: "" },
		)
		.slider({ translate: "scpdy.form.alphanumericSignOptions.spacing.label" }, 0, 2, {
			defaultValue: 0,
			valueStep: 1,
		})
		.dropdown(
			{ translate: "scpdy.form.alphanumericSignOptions.color.label" },
			[
				{
					translate: "scpdy.form.alphanumericSignOptions.color.white",
				},
				{
					translate: "scpdy.form.alphanumericSignOptions.color.black",
				},
			],
			{
				defaultValueIndex:
					(player.getDynamicProperty("lastAlphanumericSignColorSelection") as number) ?? 0,
			},
		)
		.submitButton({ translate: "scpdy.form.alphanumericSignOptions.submit" })
		// @ts-expect-error
		.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const colorIdx = Number(response.formValues[2]);

	player.setDynamicProperty("lastAlphanumericSignColorSelection", colorIdx);

	const color = colorIdx === 0 ? "white" : "black";

	return {
		text: String(response.formValues[0]),
		spacing: Number(response.formValues[1]),
		color: color,
	};
};

const asyncPlacement = async (
	player: mc.Player,
	initialBlock: mc.Block,
	upOrDown: UpOrDown,
	dir: mc.Direction,
): Promise<void> => {
	const playerMainhand = player.getComponent("equippable")!.getEquipmentSlot(
		mc.EquipmentSlot.Mainhand,
	);
	const options = await showPlacementOptionsForm(player);

	if (options === undefined) return;

	const error = (msg: mc.RawMessage) => {
		player.sendMessage(msg);
		player.playSound("note.bass");
	};

	if (vec3.distance(player.location, initialBlock.location) > 7) {
		error({ translate: "scpdy.msg.alphanumericSignPlacement.error.tooFar" });
		return;
	}

	const text = options.text.trim().toLowerCase();

	if (text === "") {
		error({ translate: "scpdy.msg.alphanumericSignPlacement.error.empty" });
		return;
	}

	if (text.length > 20) {
		error({ translate: "scpdy.msg.alphanumericSignPlacement.error.tooLong" });
		return;
	}

	// Create placement sequence
	const placementSequence: PlacementSequenceElement[] = [];
	let spacing = 0;
	for (let i = 0; i < text.length; i++) {
		if (spacing > 0) {
			placementSequence.push("space");
			spacing--;
			i--;
			continue;
		}

		spacing += options.spacing;

		const char = text[i]!;
		const permutation = getCharBlockPermutation(char);

		if (permutation instanceof mc.BlockPermutation) {
			placementSequence.push(permutation);
		} else if (permutation === "space") {
			placementSequence.push("space");
		} else {
			error({ translate: "scpdy.msg.alphanumericSignPlacement.error.unsupportedChar" });
			return;
		}
	}

	// Placement
	let block: mc.Block = initialBlock;
	for (const sequenceElement of placementSequence) {
		if (!isAirOrLiquid(block)) {
			error({ translate: "scpdy.msg.alphanumericSignPlacement.error.obstructed" });
			return;
		}

		if (sequenceElement instanceof mc.BlockPermutation) {
			if (player.getGameMode() !== mc.GameMode.Creative) {
				const itemStack = playerMainhand.getItem();

				if (!itemStack || itemStack.typeId !== "lc:scpdy_alphanumeric_sign_placer") {
					error({ translate: "scpdy.msg.alphanumericSignPlacement.error.notEnoughToComplete" });
					return;
				}

				if (itemStack.amount > 1) {
					itemStack.amount--;
					playerMainhand.setItem(itemStack);
				} else {
					playerMainhand.setItem(undefined);
				}
			}

			const permutation = sequenceElement
				.withState("lc:color", options.color)
				.withState("lc:dir", dir.toLowerCase())
				.withState("lc:updown", upOrDown);

			block.setPermutation(permutation);
		}

		let rightBlock: mc.Block | undefined;
		switch (dir) {
			case mc.Direction.North:
				rightBlock = block.west();
				break;
			case mc.Direction.West:
				rightBlock = block.south();
				break;
			case mc.Direction.South:
				rightBlock = block.east();
				break;
			case mc.Direction.East:
				rightBlock = block.north();
				break;
		}

		if (rightBlock === undefined) {
			error({ translate: "scpdy.msg.alphanumericSignPlacement.error.obstructed" });
			return;
		}

		block = rightBlock;
	}
};

const getCharBlockPermutation = (char: string): mc.BlockPermutation | "space" | undefined => {
	char = char.toLowerCase();

	if (char === " ") {
		return "space";
	}

	if (/[a-p]/.test(char)) {
		return mc.BlockPermutation.resolve("lc:scpdy_alphabet_sign_1", {
			"lc:char": char,
		});
	} else if (/[q-z]/.test(char)) {
		return mc.BlockPermutation.resolve("lc:scpdy_alphabet_sign_2", {
			"lc:char": char,
		});
	} else if (/[0-9]/.test(char)) {
		return mc.BlockPermutation.resolve("lc:scpdy_number_sign", {
			"lc:number": +char,
		});
	}

	// Match symbols
	switch (char) {
		case "+":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "plus",
			});
		case "-":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "hyphen",
			});
		case "*":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "asterisk",
			});
		case "=":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "equal",
			});
		case "/":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "slash",
			});
		case "|":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "bar",
			});
		case "\\":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "backslash",
			});
		case "@":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "at",
			});
		case "#":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "hash",
			});
		case "$":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "dollar",
			});
		case "%":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "percent",
			});
		case "^":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "caret",
			});
		case "&":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "ampersand",
			});
		case "~":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "period",
			});
		case ".":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "period",
			});
		case ",":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_1", {
				"lc:symbol": "comma",
			});
		case ":":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "colon",
			});
		case ";":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "semicolon",
			});
		case "—":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "emdash",
			});
		case "_":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "underscore",
			});
		case "(":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "paren_left",
			});
		case ")":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "paren_right",
			});
		case "[":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "bracket_left",
			});
		case "]":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "bracket_right",
			});
		case "{":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "brace_left",
			});
		case "}":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "brace_right",
			});
		case "<":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "lessthan",
			});
		case ">":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "greaterthan",
			});
		case "`":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "backtick",
			});
		case "'":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "quote",
			});
		case "\"":
			return mc.BlockPermutation.resolve("lc:scpdy_symbol_sign_2", {
				"lc:symbol": "dbquotes",
			});
	}

	return undefined;
};

const beforeOnPlayerPlace = (arg: mc.BlockComponentPlayerPlaceBeforeEvent): void => {
	arg.cancel = true;

	mc.system.run(() => {
		if (!arg.player) return;

		const upOrDown: "none" | "up" | "down" = arg.face === mc.Direction.Up
			? "up"
			: arg.face === mc.Direction.Down
			? "down"
			: "none";

		const dir = (function() {
			const y = arg.player.getRotation().y;

			if (upOrDown !== "none") {
				if (y >= -45 && y < 45) {
					return mc.Direction.North;
				} else if (y >= 45 && y < 135) {
					return mc.Direction.East;
				} else if (y >= 135 || y < -135) {
					return mc.Direction.South;
				}
				return mc.Direction.West;
			}

			return arg.face;
		})();

		asyncPlacement(arg.player, arg.block, upOrDown, dir);
	});
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:alphanumeric_sign", {
		beforeOnPlayerPlace,
	});
});

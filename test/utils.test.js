// Pin config defaults so tests remain isolated from local user adjustments.
jest.mock("../flic_hub_module/config", () => ({
	...jest.requireActual("../flic_hub_module/config"),
	WARNING_BATTERY_LEVEL: 8,
}));

const utils = require("../flic_hub_module/utils");
const CFG = require("../flic_hub_module/config");
const C = require("../flic_hub_module/constants");

// utils.js keeps module-level state keyed by bdaddr, so tests use distinct
// bdaddr values to stay isolated from one another.
const button = (bdaddr, extra) => Object.assign({ bdaddr }, extra);

describe("getButtonName", () => {
	test("strips colons and prefixes flic_", () => {
		expect(utils.getButtonName(button("80:e4:da:78:b0:5d"))).toBe("flic_80e4da78b05d");
	});
});

describe("getButtonFriendlyName", () => {
	// The SDK types `name` as a String, so an unnamed button may report "" rather than null;
	// both must fall back to getButtonName instead of producing a blank friendly name.
	test.each([
		["Kitchen", undefined, "Kitchen"],
		["Kitchen", "Battery", "Kitchen Battery"],
		[null, undefined, "flic_80e4da78b05d"],
		[null, "Connectivity", "flic_80e4da78b05d Connectivity"],
		["", "Battery", "flic_80e4da78b05d Battery"],
	])("name %p with suffix %p is %p", (name, suffix, expected) => {
		expect(utils.getButtonFriendlyName(button("80:e4:da:78:b0:5d", { name }), suffix)).toBe(expected);
	});
});

// Valid mdi:battery-* icons. mdi:battery-outline and mdi:battery represent 0% and 100%,
// bounding getBatteryIcon's rounded decade icons between 5 and 95.
const VALID_BATTERY_ICONS = [
	"mdi:battery",
	"mdi:battery-outline",
	"mdi:battery-alert",
	"mdi:battery-unknown",
	"mdi:battery-10",
	"mdi:battery-20",
	"mdi:battery-30",
	"mdi:battery-40",
	"mdi:battery-50",
	"mdi:battery-60",
	"mdi:battery-70",
	"mdi:battery-80",
	"mdi:battery-90"
];

describe("getBatteryIcon", () => {
	// getBatteryIcon reads CFG.WARNING_BATTERY_LEVEL dynamically, allowing per-test overrides.
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const setWarningLevel = (level) => jest.replaceProperty(CFG, "WARNING_BATTERY_LEVEL", level);

	// Missing or non-numeric battery levels fall back to mdi:battery-unknown.
	const UNUSABLE_LEVELS = [C.BATTERY_STATE_UNKNOWN, "unavailable", undefined, null, NaN, {}];

	// A threshold of 0 disables the alert band ([5, 0]), testing rounding only.
	describe("rounding (warning band disabled)", () => {
		beforeEach(() => setWarningLevel(0));

		// Midpoint values (5, 15, 55, 85, etc.) round up to the next decade icon.
		test.each([
			[0, "mdi:battery-outline"],
			[4, "mdi:battery-outline"],
			[5, "mdi:battery-10"],
			[14, "mdi:battery-10"],
			[15, "mdi:battery-20"],
			[24, "mdi:battery-20"],
			[54, "mdi:battery-50"],
			[55, "mdi:battery-60"],
			[85, "mdi:battery-90"],
			[94, "mdi:battery-90"],
			[95, "mdi:battery"],
			[100, "mdi:battery"]
		])("%i maps to %s", (level, icon) => {
			expect(utils.getBatteryIcon(level)).toBe(icon);
		});
	});

	describe("warning band", () => {
		// Warning band [5, WARNING_BATTERY_LEVEL] takes precedence over standard rounding.
		test("spans [5, WARNING_BATTERY_LEVEL] inclusive", () => {
			setWarningLevel(8);
			expect(utils.getBatteryIcon(5)).toBe("mdi:battery-alert");
			expect(utils.getBatteryIcon(8)).toBe("mdi:battery-alert");
			expect(utils.getBatteryIcon(9)).toBe("mdi:battery-10");
		});

		test("tracks the configured threshold instead of a fixed level", () => {
			setWarningLevel(25);
			expect(utils.getBatteryIcon(25)).toBe("mdi:battery-alert");
			expect(utils.getBatteryIcon(26)).toBe("mdi:battery-30");
		});

		// 0-4% renders as an empty battery (mdi:battery-outline) rather than alert.
		test("does not extend below 5, which stays the empty icon", () => {
			setWarningLevel(8);
			expect(utils.getBatteryIcon(4)).toBe("mdi:battery-outline");
			expect(utils.getBatteryIcon(0)).toBe("mdi:battery-outline");
		});
	});

	test.each(UNUSABLE_LEVELS)("%p maps to the unknown icon", (level) => {
		expect(utils.getBatteryIcon(level)).toBe("mdi:battery-unknown");
	});

	// Non-numeric levels return early and are tested separately above.
	test.each([0, 5, 8, 10, 25, 95])(
		"never emits an icon outside the real MDI set (WARNING_BATTERY_LEVEL = %i)",
		(warningLevel) => {
			setWarningLevel(warningLevel);
			for (let level = 0; level <= 100; level++) {
				expect(VALID_BATTERY_ICONS).toContain(utils.getBatteryIcon(level));
			}
		}
	);
});

describe("getConnectivityIcon", () => {
	test("true maps to bluetooth, false to bluetooth-off", () => {
		expect(utils.getConnectivityIcon(true)).toBe("mdi:bluetooth");
		expect(utils.getConnectivityIcon(false)).toBe("mdi:bluetooth-off");
	});
});

// utils.js stores state; gesture interpretation belongs to main.js.
describe("per-button state", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test("an unknown button reads back as INITIAL_STATE without creating an entry", () => {
		const b = button("00:00:00:00:00:01");
		expect(utils.getButtonState(b)).toEqual(C.INITIAL_STATE);
		expect(utils.getButtonEventTimestamp(b)).toBe(0);
		expect(utils.getButtonEventEmitted(b)).toBe(C.CLICK_NONE);
		expect(utils.deleteButtonState(b)).toBe(false);
	});

	test("the setters round-trip through the field getters and getButtonState", () => {
		const t = 1_700_000_000_000;
		jest.setSystemTime(t);
		const b = button("00:00:00:00:00:02");
		utils.setButtonPressedTimestamp(b);
		utils.setButtonEventTimestamp(b, 42);
		utils.setButtonEventEmitted(b, C.CLICK_WAITING);
		expect(utils.getButtonEventTimestamp(b)).toBe(42);
		expect(utils.getButtonEventEmitted(b)).toBe(C.CLICK_WAITING);
		expect(utils.getButtonState(b)).toEqual({ eventTimestamp: 42, pressedTimestamp: t, eventEmitted: C.CLICK_WAITING });
	});

	test("state is isolated per button", () => {
		const a = button("00:00:00:00:00:03");
		const b = button("00:00:00:00:00:04");
		utils.setButtonEventEmitted(a, C.CLICK_SINGLE);
		expect(utils.getButtonEventEmitted(a)).toBe(C.CLICK_SINGLE);
		expect(utils.getButtonEventEmitted(b)).toBe(C.CLICK_NONE);
	});

	test("getButtonState returns a copy, not the stored state", () => {
		const b = button("00:00:00:00:00:05");
		utils.setButtonEventEmitted(b, C.CLICK_WAITING);
		const state = utils.getButtonState(b);
		state.eventEmitted = C.CLICK_HOLD;
		state.eventTimestamp = 42;
		expect(utils.getButtonEventEmitted(b)).toBe(C.CLICK_WAITING);
		expect(utils.getButtonEventTimestamp(b)).toBe(0);
	});

	test("initButtonState resets every field to INITIAL_STATE", () => {
		jest.setSystemTime(1_700_000_000_000);
		const b = button("00:00:00:00:00:06");
		utils.setButtonPressedTimestamp(b);
		utils.setButtonEventTimestamp(b, 123456);
		utils.setButtonEventEmitted(b, C.CLICK_HOLD); // stale click type from before the (re)connect
		utils.initButtonState(b);
		expect(utils.getButtonState(b)).toEqual(C.INITIAL_STATE);
	});

	test("deleteButtonState removes the entry and reports it", () => {
		jest.setSystemTime(1_700_000_000_000);
		const b = button("00:00:00:00:00:07");
		utils.setButtonPressedTimestamp(b);
		utils.setButtonEventTimestamp(b, 42);
		utils.setButtonEventEmitted(b, C.CLICK_HOLD);
		expect(utils.deleteButtonState(b)).toBe(true);
		expect(utils.getButtonState(b)).toEqual(C.INITIAL_STATE);
		expect(utils.deleteButtonState(b)).toBe(false);
	});
});

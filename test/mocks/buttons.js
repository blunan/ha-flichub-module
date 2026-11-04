// Mock of the Flic Hub SDK "buttons" module (buttonManager).
// Jest maps the bare `buttons` specifier to this file. It hands out shallow
// copies matching SDK semantics and exposes `__`-prefixed test helpers.

const handlers = {};
let buttons = [];

module.exports = {
	// ---- API used by the module under test ----
	getButtons() {
		return buttons.map((button) => ({ ...button }));
	},
	getButton(bdaddr) {
		const button = buttons.find((b) => b.bdaddr === bdaddr);
		return button && { ...button };
	},
	on(event, cb) {
		handlers[event] = cb;
	},

	// ---- test helpers ----
	__setButtons(list) {
		buttons = list.slice();
	},
	__addButton(button) {
		buttons.push(button);
	},
	__fire(event, obj) {
		const handler = handlers[event];
		if (!handler) {
			throw new Error("No handler registered for event: " + event);
		}
		return handler(obj);
	},
};

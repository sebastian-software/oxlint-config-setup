import userEvent from "@testing-library/user-event";

async function verify() {
  await userEvent.click({});
}

void verify();

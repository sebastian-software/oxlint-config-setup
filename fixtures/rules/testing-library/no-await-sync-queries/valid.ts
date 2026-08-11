import { screen } from "@testing-library/react";

async function verify() {
  screen.getByRole("button");
}

void verify();

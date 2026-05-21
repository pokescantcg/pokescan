import bcrypt from "bcrypt";

const run = async () => {
  const hash = await bcrypt.hash("Pkiller89!", 10);
  console.log(hash);
};

run();
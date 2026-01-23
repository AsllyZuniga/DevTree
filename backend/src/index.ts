import colors from "colors";
import server from "./server";
const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(
    colors.bgBlue.magenta.italic(`Servidor Funcionando en el puerto: ${port}`)
  );
});


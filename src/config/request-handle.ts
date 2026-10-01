// Compatibilidade: os serviços atuais do cardápio usam o cliente público.
// Novos códigos devem importar publicApi/panelApi de "@/lib/http".
import { publicApi } from "@/lib/http";

export default publicApi;

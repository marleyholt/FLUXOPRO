const fs = require('fs');
const file = Buffer.from('c3JjL2NvbXBvbmVudHMvdGFicy9Nb250aGx5Q29udHJvbFRhYi50c3g=', 'base64').toString();
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const target = `                                 {unplannedCards.map((tx) => (
                                   <div
                                     key={\`unplanned-card-\${tx.id}\`}
                                     className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-indigo-950/30 border border-indigo-500/30 text-indigo-200"
                                   >
                                     <div className="truncate mr-2 flex items-center gap-2">
                                       <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-200">
                                         CARTÃO • SEM PREVISÃO
                                       </span>
                                       <span className="font-medium truncate">{tx.description}</span>
                                     </div>
                                     <span className="font-mono-numbers font-bold text-indigo-300">
                                       {formatBRL(tx.installmentAmount)}
                                     </span>
                                   </div>
                                 ))}`;

const replacement = `                                 {unplannedCards.map((tx) => (
                                   <div
                                     key={\`unplanned-card-\${tx.id}\`}
                                     className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-2 px-2.5 rounded bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 gap-2"
                                   >
                                     <div className="truncate mr-2 flex items-center gap-2">
                                       <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-200 shrink-0">
                                         CARTÃO • SEM PREVISÃO
                                       </span>
                                       <span className="font-medium truncate">{tx.description}</span>
                                     </div>

                                     <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                       <select
                                         value={tx.linkedSubItemId ? \`sub_\${tx.linkedSubItemId}\` : 'unplanned'}
                                         onChange={(e) => {
                                           const val = e.target.value;
                                           let linkedSubItemId = undefined;
                                           let isUnplanned = true;
                                           if (val.startsWith('sub_')) {
                                             linkedSubItemId = val.replace('sub_', '');
                                             isUnplanned = false;
                                           }
                                           updateCardTransaction({
                                             ...tx,
                                             linkedSubItemId,
                                             isUnplanned,
                                           });
                                         }}
                                         className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[11px] text-emerald-300 font-medium outline-none focus:border-emerald-500"
                                         title="Associar fatura de cartão a um item previsto"
                                       >
                                         <option value="unplanned">🔗 Vincular Previsão...</option>
                                         {env?.subItems && env.subItems.map((sub) => (
                                           <option key={sub.id} value={\`sub_\${sub.id}\`}>
                                             {sub.name} ({formatBRL(sub.amount)})
                                           </option>
                                         ))}
                                       </select>

                                       <span className="font-mono-numbers font-bold text-indigo-300">
                                         {formatBRL(tx.installmentAmount)}
                                       </span>
                                     </div>
                                   </div>
                                 ))}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('PATCH SUCCESS');
} else {
  console.log('PATCH TARGET NOT FOUND');
}

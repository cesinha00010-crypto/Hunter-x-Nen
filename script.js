document.addEventListener('DOMContentLoaded', () => {
    const ROLL_BONUS_TRAINED = 5;
    const AUTOSAVE_INTERVAL = 3000;
    const ATTR_NEN_MAP = {
        'intensificacao': 'vigor',
        'emissao': 'forca',
        'transmutacao': 'destreza',
        'manipulacao': 'carisma',
        'materializacao': 'intelecto',
        'especializacao': 'livre'
    };

    // --- 1. FUNÇÕES DE AUTO-SAVE E CARREGAMENTO ---

    function saveFicha() {
        const ficha = {};
        const inputElements = document.querySelectorAll('input, textarea, select, .trained-checkbox');

        inputElements.forEach(element => {
            const id = element.id || element.name || (element.classList.contains('trained-checkbox') ? element.previousElementSibling?.htmlFor || element.getAttribute('id') : null);
            if (id) {
                if (element.type === 'checkbox') {
                    ficha[id] = element.checked;
                } else if (element.tagName === 'SELECT' || element.type === 'text' || element.type === 'number') {
                    ficha[id] = element.value;
                }
            }
        });

        // Captura Armas
        const weapons = [];
        document.querySelectorAll('#weapons-table tbody tr').forEach((row) => {
            const inputs = row.querySelectorAll('input');
            weapons.push({
                nome: inputs[0].value,
                tipo: inputs[1].value,
                ataque: inputs[2].value, // Agora é texto livre
                dano: inputs[3].value,
                critico: inputs[4].value,
                peso: inputs[5].value,
            });
        });
        ficha['weapons'] = weapons;
        
        // Captura Inventário
        const inventory = [];
        document.querySelectorAll('#inventory-table tbody tr').forEach((row) => {
            const inputs = row.querySelectorAll('input');
            inventory.push({
                item: inputs[0].value,
                detalhes: inputs[1].value,
                peso: inputs[2].value,
                pagina: inputs[3].value,
            });
        });
        ficha['inventory'] = inventory;


        // Captura Hatsus
        const hatsus = [];
        document.querySelectorAll('.hatsu-item').forEach(item => {
            hatsus.push({
                nome: item.querySelector('.hatsu-name').value,
                tipo: item.querySelector('.hatsu-type').value,
                categoria: item.querySelector('.hatsu-category').value,
                custo: item.querySelector('.hatsu-cost').value,
                duracao: item.querySelector('.hatsu-duration').value,
                execucao: item.querySelector('.hatsu-execution').value,
                alvo: item.querySelector('.hatsu-target').value,
                alcance: item.querySelector('.hatsu-range').value,
                descricao: item.querySelector('textarea').value
            });
        });
        ficha['hatsus'] = hatsus;
        
        // Captura o estado de minimização
        ficha['rollMinimized'] = document.getElementById('dice-roll-area').classList.contains('minimized');


        localStorage.setItem('hunterXNenFicha', JSON.stringify(ficha));
        updateInventoryWeight();
        console.log('Ficha salva automaticamente.');
    }

    function loadFicha() {
        const savedFicha = localStorage.getItem('hunterXNenFicha');
        if (savedFicha) {
            const ficha = JSON.parse(savedFicha);

            for (const id in ficha) {
                const element = document.getElementById(id) || document.querySelector(`[for="${id}"] + .trained-checkbox`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = ficha[id];
                    } else {
                        element.value = ficha[id];
                    }
                }
            }
            
            // Estado de minimização
            if (ficha.rollMinimized) {
                 document.getElementById('dice-roll-area').classList.add('minimized');
            } else {
                 document.getElementById('dice-roll-area').classList.remove('minimized');
            }

            // Recria a tabela de armas
            document.querySelector('#weapons-table tbody').innerHTML = '';
            if (ficha.weapons && ficha.weapons.length > 0) {
                ficha.weapons.forEach(weapon => addWeaponRow(weapon));
            } else {
                addWeaponRow();
            }
            
            // Recria a tabela de Inventário
            document.querySelector('#inventory-table tbody').innerHTML = '';
            if (ficha.inventory && ficha.inventory.length > 0) {
                ficha.inventory.forEach(item => addInventoryRow(item));
            } else {
                 addInventoryRow(); 
            }

            // Recria Hatsus
            document.getElementById('hatsu-list').innerHTML = ''; 
            if (ficha.hatsus && ficha.hatsus.length > 0) {
                ficha.hatsus.forEach(hatsu => addHatsuItem(hatsu));
            } else {
                 addHatsuItem();
            }

            updateNenBaseAttr();
            updateAuraBonus();
            updateInventoryWeight();

            console.log('Ficha carregada.');
        } else {
            // Inicialização com linhas vazias se não houver salvamento
            addWeaponRow();
            addInventoryRow();
            addHatsuItem();
            updateInventoryWeight();
        }
    }

    // Configura auto-save em todos os inputs
    document.querySelectorAll('input, textarea, select, .trained-checkbox').forEach(element => {
        element.addEventListener('change', saveFicha);
        element.addEventListener('keyup', saveFicha);
    });

    setInterval(saveFicha, AUTOSAVE_INTERVAL);

    // --- 2. LÓGICA DO NEN & GERAL ---

    const nenTypeSelect = document.getElementById('nen-type');
    const nenBaseAttrInput = document.getElementById('nen-base-attr');
    const nenAuraBonusInput = document.getElementById('nen-aura-bonus');

    function updateNenBaseAttr() {
        const nenType = nenTypeSelect.value;
        const attrKey = ATTR_NEN_MAP[nenType];

        if (attrKey && attrKey !== 'livre') {
            nenBaseAttrInput.value = attrKey.toUpperCase();
        } else if (attrKey === 'livre') {
            nenBaseAttrInput.value = 'Livre (Especialização)';
        } else {
            nenBaseAttrInput.value = 'Nenhum';
        }
    }

    function updateAuraBonus() {
        const nenType = nenTypeSelect.value;
        const attrKey = ATTR_NEN_MAP[nenType];
        let bonus = 0;

        if (attrKey && attrKey !== 'livre') {
            // Pega o valor do Atributo Base e calcula o bônus
            const attrValue = parseInt(document.getElementById(attrKey).value) || 0;
            bonus = attrValue * 5; 
        }
        
        nenAuraBonusInput.value = bonus;
    }

    nenTypeSelect.addEventListener('change', () => {
        updateNenBaseAttr();
        updateAuraBonus();
        saveFicha();
    });

    document.querySelectorAll('.attr-value').forEach(input => {
        input.addEventListener('change', () => {
            updateAuraBonus();
            saveFicha();
        });
    });
    
    // Funcionalidade de adicionar Hatsu
    document.getElementById('add-hatsu-btn').addEventListener('click', () => {
        addHatsuItem();
        saveFicha();
    });
    
    function addHatsuItem(data = {}) {
        const hatsuList = document.getElementById('hatsu-list');
        const newItem = document.createElement('div');
        newItem.classList.add('hatsu-item');
        newItem.innerHTML = `
            <input type="text" placeholder="Nome do Hatsu" class="hatsu-name" value="${data.nome || ''}">
            <div class="hatsu-details-grid">
                <select class="hatsu-type" title="Tipo de Nen">
                    <option value="${data.tipo || 'none'}" selected hidden>${data.tipo || 'Tipo de Nen'}</option>
                    <option value="Intensificacao">Intensificação</option>
                    <option value="Emissao">Emissão</option>
                    <option value="Transmutacao">Transmutação</option>
                    <option value="Manipulacao">Manipulação</option>
                    <option value="Materializacao">Materialização</option>
                    <option value="Especializacao">Especialização</option>
                </select>
                <input type="text" placeholder="Categoria" class="hatsu-category" value="${data.categoria || ''}">
                <input type="text" placeholder="Custo (PA)" class="hatsu-cost" value="${data.custo || ''}">
                <input type="text" placeholder="Duração" class="hatsu-duration" value="${data.duracao || ''}">
                <input type="text" placeholder="Execução" class="hatsu-execution" value="${data.execucao || ''}">
                <input type="text" placeholder="Alvo" class="hatsu-target" value="${data.alvo || ''}">
                <input type="text" placeholder="Alcance" class="hatsu-range" value="${data.alcance || ''}">
            </div>
            <textarea placeholder="Descrição e Efeitos do Hatsu">${data.descricao || ''}</textarea>
            <button class="btn-delete-hatsu">Excluir</button>
        `;
        hatsuList.appendChild(newItem);
        
        newItem.querySelector('.btn-delete-hatsu').addEventListener('click', (e) => {
            e.target.closest('.hatsu-item').remove();
            saveFicha();
        });
        
        newItem.querySelectorAll('input, textarea, select').forEach(el => {
            el.addEventListener('change', saveFicha);
            el.addEventListener('keyup', saveFicha);
        });
    }


    // --- 3. LÓGICA DE ROLAGEM (D20 MODIFICADO) ---

    function rollDice(attrValue, isTrained) {
        let diceRolls = [];
        let numRolls = Math.max(1, attrValue);

        if (attrValue === 0) {
            numRolls = 1;
            const roll = Math.floor(Math.random() * 20) + 1;
            const finalResult = roll - 5;
            diceRolls.push(roll);
            return { rolls: diceRolls, total: finalResult, bonus: -5, isZeroAttr: true };
        } else {
            for (let i = 0; i < numRolls; i++) {
                diceRolls.push(Math.floor(Math.random() * 20) + 1);
            }
            const highestRoll = Math.max(...diceRolls);
            const bonus = isTrained ? ROLL_BONUS_TRAINED : 0;
            const finalResult = highestRoll + bonus;

            return { rolls: diceRolls, total: finalResult, highest: highestRoll, bonus: bonus, isZeroAttr: false };
        }
    }

    function displayRollResult(result, attrName, skillName) {
        const rollDisplay = document.getElementById('roll-display');
        const rollHistory = document.getElementById('roll-history');
        const rollDetails = result.rolls.join(', ');
        let rollText = '';

        const skillLabel = skillName === 'none' ? '' : ` (${skillName})`;
        const bonusText = result.isZeroAttr ? ` - 5` : result.bonus > 0 ? ` + ${result.bonus} (Treinado)` : '';
        const highestText = result.isZeroAttr ? '' : ` | MAIOR: ${result.highest}`;
        
        rollText = `(${attrName}${skillLabel}) ROLAGENS: ${rollDetails}${highestText}${bonusText} = <span class="roll-result-final">${result.total}</span>`;


        // Atualiza display principal
        rollDisplay.innerHTML = rollText;
        rollDisplay.classList.add('rolled');
        setTimeout(() => rollDisplay.classList.remove('rolled'), 500); 

        // Adiciona ao histórico
        const historyItem = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        historyItem.innerHTML = `[${timestamp}] ${rollText}`;
        rollHistory.prepend(historyItem);
    }

    document.querySelectorAll('.roll-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const attrKey = e.target.getAttribute('data-attr');
            const skillKey = e.target.getAttribute('data-pericia');
            const attrSelectId = e.target.getAttribute('data-attr-select');
            const periciaCheckboxId = e.target.getAttribute('data-pericia-checkbox');
            
            let finalAttrKey = attrKey;
            let finalSkillKey = skillKey;
            let attrValue, isTrained;

            if (attrSelectId && periciaCheckboxId) {
                // Lógica para Controle de Nen
                finalAttrKey = document.getElementById(attrSelectId).value;
                attrValue = parseInt(document.getElementById(finalAttrKey).value) || 0;
                isTrained = document.getElementById(periciaCheckboxId).checked;
                finalSkillKey = 'Controle de Nen'; // Nome da perícia para o display
            } else {
                // Lógica para Atributos/Perícias normais
                attrValue = parseInt(document.getElementById(attrKey).value) || 0;
                isTrained = finalSkillKey !== 'none' ? document.getElementById(`pericia-${finalSkillKey}`).checked : false;
            }

            const result = rollDice(attrValue, isTrained);
            displayRollResult(result, finalAttrKey.toUpperCase(), finalSkillKey);
        });
    });

    // Minimização da Área de Rolagem
    document.getElementById('minimize-roll').addEventListener('click', () => {
        document.getElementById('dice-roll-area').classList.toggle('minimized');
        saveFicha(); // Salva o estado de minimização
    });
    
    // --- 4. FUNÇÕES DE ARMAS/EQUIPAMENTOS ---
    
    function addWeaponRow(data = {}) {
        const tableBody = document.querySelector('#weapons-table tbody');
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" value="${data.nome || ''}" placeholder="Nome"></td>
            <td><input type="text" value="${data.tipo || ''}" placeholder="Tipo"></td>
            <td><input type="text" value="${data.ataque || ''}" placeholder="FOR/DEX +X"></td>
            <td><input type="text" value="${data.dano || ''}" placeholder="1d8+FOR"></td>
            <td><input type="text" value="${data.critico || ''}" placeholder="19-20/x2"></td>
            <td><input type="number" value="${data.peso || ''}" class="inventory-weight-input" min="0"></td>
        `;
        
        newRow.querySelectorAll('input').forEach(el => {
            el.addEventListener('change', saveFicha);
            el.addEventListener('keyup', saveFicha);
        });
    }

    document.getElementById('add-weapon-btn').addEventListener('click', () => {
        addWeaponRow();
        saveFicha();
    });

    // --- 5. FUNÇÕES DE INVENTÁRIO ---

    function updateInventoryWeight() {
        let totalWeight = 0;
        document.querySelectorAll('#inventory-table tbody .inventory-weight-input, #weapons-table tbody .inventory-weight-input').forEach(input => {
            const weight = parseFloat(input.value) || 0;
            totalWeight += weight;
        });

        document.getElementById('inventory-current-weight').textContent = `Carga Atual: ${totalWeight.toFixed(1)}`;
        
        // Você pode adicionar a lógica de limite de peso aqui se desejar um alerta!
        const limit = parseInt(document.getElementById('inventory-limit').value) || 0;
        if (totalWeight > limit) {
             document.getElementById('inventory-current-weight').style.color = 'var(--color-secondary)';
        } else {
             document.getElementById('inventory-current-weight').style.color = 'var(--color-primary)';
        }
    }
    
    function addInventoryRow(data = {}) {
        const tableBody = document.querySelector('#inventory-table tbody');
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" value="${data.item || ''}" placeholder="Item"></td>
            <td><input type="text" value="${data.detalhes || ''}" placeholder="Detalhes do item"></td>
            <td><input type="number" value="${data.peso || ''}" class="inventory-weight-input" min="0"></td>
            <td><input type="text" value="${data.pagina || ''}" placeholder="Página/Local"></td>
        `;

        newRow.querySelector('.inventory-weight-input').addEventListener('input', updateInventoryWeight);
        
        newRow.querySelectorAll('input').forEach(el => {
            el.addEventListener('change', saveFicha);
            el.addEventListener('keyup', saveFicha);
        });
    }

    document.getElementById('add-inventory-btn').addEventListener('click', () => {
        addInventoryRow();
        saveFicha();
    });

    document.getElementById('inventory-limit').addEventListener('input', updateInventoryWeight);
    
    // --- 6. TEMA DARK/LIGHT ---
    // (Mantido o código original)

    document.getElementById('toggle-theme').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    // --- 7. INICIALIZAÇÃO ---

    loadTheme();
    loadFicha();
});
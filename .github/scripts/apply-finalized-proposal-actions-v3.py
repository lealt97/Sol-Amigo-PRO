from pathlib import Path
import runpy

calculator = Path('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
script_path = Path('.github/scripts/apply-finalized-proposal-actions-v3.py')
original = calculator.read_text(encoding='utf-8')
old_marker = "</div>\n\n                {isLoadingClients ? ("
normalized_marker = "</div>\n\n                 {isLoadingClients ? ("

try:
    if old_marker not in original:
        raise RuntimeError('Marcador de clientes não encontrado para normalização.')

    calculator.write_text(original.replace(old_marker, normalized_marker, 1), encoding='utf-8')
    runpy.run_path('.github/scripts/apply-finalized-proposal-actions-v2.py', run_name='__main__')
except BaseException as error:
    calculator.write_text(original, encoding='utf-8')
    current_script = script_path.read_text(encoding='utf-8')
    diagnostic_line = f"\n# PATCH_DIAGNOSTIC: {type(error).__name__}: {error}\n"
    if '# PATCH_DIAGNOSTIC:' in current_script:
        current_script = current_script.split('\n# PATCH_DIAGNOSTIC:', 1)[0].rstrip() + '\n'
    script_path.write_text(current_script + diagnostic_line, encoding='utf-8')

# PATCH_DIAGNOSTIC: SystemExit: Marcador não encontrado: botão final

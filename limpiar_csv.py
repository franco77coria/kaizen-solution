import csv
import os

INPUT_FILE = r"c:\Users\Usuario\OneDrive\Escritorio\Pagina web\Base de datos para DASHBOARD - Base Dash (2).csv"
OUTPUT_FILE = r"c:\Users\Usuario\OneDrive\Escritorio\Pagina web\Base de datos para DASHBOARD - Base Dash (2)_limpio.csv"

# ============================================================
# 1. NOMBRES COMUNES COLOMBIANOS → GÉNERO
# ============================================================
NOMBRES_FEMENINOS = {
    'MARIA', 'ANA', 'ANDREA', 'ANGELA', 'BEATRIZ', 'BLANCA', 'CAMILA', 'CAROLINA',
    'CARMEN', 'CATALINA', 'CECILIA', 'CLARA', 'CLAUDIA', 'CONSUELO', 'CRISTINA',
    'DANIELA', 'DIANA', 'DOLORES', 'ELENA', 'ELIZABETH', 'ELSA', 'ESPERANZA',
    'ESTEFANIA', 'ESTEFANÍA', 'EUGENIA', 'EVA', 'FABIOLA', 'FERNANDA', 'FLOR',
    'FLORA', 'FRANCISCA', 'GABRIELA', 'GLADYS', 'GLORIA', 'GRACIELA', 'HELENA',
    'INES', 'INÉS', 'INGRID', 'IRENE', 'ISABEL', 'ISABELLA', 'IVONNE', 'JACQUELINE',
    'JENNIFER', 'JESSICA', 'JIMENA', 'JOHANA', 'JOHANNA', 'JOSEFINA', 'JUANA',
    'JULIA', 'JULIANA', 'JULIETH', 'KAREN', 'KATHERINE', 'KATERINE', 'LAURA',
    'LEIDY', 'LEONOR', 'LIDA', 'LILIANA', 'LINA', 'LIZETH', 'LORENA', 'LOURDES',
    'LUCIA', 'LUCÍA', 'LUISA', 'LUZ', 'MAGDALENA', 'MANUELA', 'MARCELA',
    'MARGARITA', 'MARIANA', 'MARIBEL', 'MARINA', 'MARLENE', 'MARLENY', 'MARTA',
    'MARTHA', 'MAYRA', 'MERCEDES', 'MILENA', 'MIREYA', 'MONICA', 'MÓNICA',
    'NANCY', 'NATALIA', 'NATALY', 'NELLY', 'NIDIA', 'NOHORA', 'NORA', 'NORMA',
    'NUBIA', 'OLGA', 'PAOLA', 'PATRICIA', 'PAULA', 'PILAR', 'RAQUEL', 'REBECA',
    'ROCIO', 'ROCÍO', 'ROSA', 'ROSALBA', 'ROSARIO', 'ROSMERY', 'RUTH', 'SANDRA',
    'SARA', 'SILVIA', 'SOFIA', 'SOFÍA', 'SONIA', 'STELLA', 'SUSANA', 'TATIANA',
    'TERESA', 'VALENTINA', 'VALERIA', 'VANESSA', 'VERONICA', 'VERÓNICA',
    'VICTORIA', 'VILMA', 'VIRGINIA', 'VIVIANA', 'XIMENA', 'YAMILE', 'YANETH',
    'YENNY', 'YOLANDA', 'YUDY', 'YULIANA', 'ADRIANA', 'AIDE', 'AIDA', 'ALBA',
    'ALEJANDRA', 'ALEXANDRA', 'ALICIA', 'AMANDA', 'AMPARO', 'ANYELA', 'AURA',
    'AURORA', 'BERTHA', 'DERLY', 'DORA', 'EDITH', 'ELIANA', 'ERIKA', 'FANNY',
    'FRANCY', 'GINA', 'GLADIS', 'HERMINIA', 'IRMA', 'JENNY', 'JEANNETH',
    'KELLY', 'LADY', 'LEONORA', 'LETICIA', 'LEYDI', 'LIGIA', 'LUCERO', 'LUZMILA',
    'MAGNOLIA', 'MARICEL', 'MARISOL', 'MATILDE', 'MAYERLY', 'MELISSA', 'MERY',
    'MIRYAM', 'MIRIAM', 'NIEVES', 'OMAIRA', 'ORLANDA', 'PIEDAD', 'ROSALINDA',
    'ROSANA', 'RUBIELA', 'RUSMIRA', 'STEFANIA', 'YEIMY', 'YERLIN', 'YESENIA',
    'YESICA', 'YISED', 'YULI', 'ZULAY', 'ZORAIDA', 'ESPERANZA', 'ESTRELLA',
    'HERMINDA', 'MARITZA', 'MYRIAM', 'NELCY', 'NOHEMI', 'OFELIA', 'OLIVA',
    'PABLA', 'PAULINA', 'PERLA', 'ROSALINA', 'SIXTA', 'SOCORRO', 'SOLEDAD',
    'SORAYA', 'SUSY', 'TULIA', 'URSULA', 'YULIETH', 'ZULMA', 'CONSTANZA',
    'DEISY', 'ELVIA', 'EMILIA', 'FLORI', 'GLADYZ', 'HILDA', 'LUCILA',
    'MARLEN', 'MARLENI', 'MARLENIS', 'NURY', 'RUBY', 'YAQUELIN', 'YURI',
}

NOMBRES_MASCULINOS = {
    'JOSE', 'JOSÉ', 'JUAN', 'CARLOS', 'LUIS', 'JORGE', 'PEDRO', 'MIGUEL',
    'ANDRES', 'ANDRÉS', 'ANTONIO', 'DANIEL', 'DAVID', 'DIEGO', 'EDGAR',
    'EDUARDO', 'ENRIQUE', 'ERNESTO', 'FABIO', 'FERNANDO', 'FRANCISCO',
    'FREDDY', 'GABRIEL', 'GERMAN', 'GERMÁN', 'GONZALO', 'GUILLERMO',
    'GUSTAVO', 'HECTOR', 'HÉCTOR', 'HENRY', 'HERNAN', 'HERNÁN', 'HUGO',
    'IVAN', 'IVÁN', 'JAIME', 'JAIR', 'JAVIER', 'JEISSON', 'JESUS', 'JESÚS',
    'JHON', 'JIMMY', 'JOHN', 'JONATHAN', 'JULIAN', 'JULIÁN', 'JULIO',
    'LEONARDO', 'LORENZO', 'MANUEL', 'MARCO', 'MARCOS', 'MARIO', 'MARTIN',
    'MATEO', 'MAURICIO', 'NELSON', 'NICOLAS', 'NICOLÁS', 'OMAR', 'OSCAR',
    'ÓSCAR', 'PABLO', 'RAFAEL', 'RAMON', 'RAMÓN', 'RAUL', 'RAÚL', 'RICARDO',
    'ROBERTO', 'RODRIGO', 'SAMUEL', 'SANTIAGO', 'SEBASTIAN', 'SEBASTIÁN',
    'SERGIO', 'VICTOR', 'VÍCTOR', 'WILLIAM', 'WILSON', 'ALEX', 'ALEXANDER',
    'ALFONSO', 'ALFREDO', 'ALVARO', 'ÁLVARO', 'ARIEL', 'ARTURO', 'BERNARDO',
    'BRAYAN', 'BRYAN', 'CAMILO', 'CESAR', 'CÉSAR', 'CRISTIAN', 'DARIO',
    'DARÍO', 'DUVAN', 'EDINSON', 'EDWIN', 'ESTEBAN', 'FABIÁN', 'FABIAN',
    'FELIPE', 'FREDY', 'FERNEY', 'GIOVANNY', 'HAROLD', 'JAIRO', 'JHONATAN',
    'JOHAN', 'LARRY', 'LEON', 'LEÓN', 'MARIANO', 'NÉSTOR', 'NESTOR', 'ORLANDO',
    'OSWALDO', 'RAFAEL', 'REINALDO', 'RICHARD', 'ROBIN', 'ROMAN', 'ROMÁN',
    'RUBÉN', 'RUBEN', 'SAUL', 'SAÚL', 'STIVEN', 'STEVEN', 'TOMAS', 'TOMÁS',
    'YESID', 'YOHAN', 'MILLER', 'CRISTHIAN', 'ELKIN', 'EDISON', 'EFRAIN',
    'EFRAÍN', 'EMILIO', 'EUGENIO', 'ISIDRO', 'LIBARDO', 'LUCIANO', 'MISAEL',
    'OVIDIO', 'TULIO', 'VIRGILIO', 'ABRAHAM', 'ALBEIRO', 'ALIRIO', 'AQUILINO',
    'ARNULFO', 'BAUDILIO', 'BELISARIO', 'BENITO', 'BLAS', 'BONIFACIO',
    'CAMPO', 'CIRO', 'CLEMENTE', 'DEMETRIO', 'ELIAS', 'ELIECER',
    'EPIFANIO', 'EVARISTO', 'FAUSTO', 'FIDEL', 'FLAMINIO', 'FROILAN',
    'GILBERTO', 'GREGORIO', 'HERIBERTO', 'HERMES', 'HERNANDO', 'HILARIO',
    'ISAIAS', 'ISIDORO', 'JACINTO', 'JOEL', 'JUVENAL', 'LEOVIGILDO',
    'LUBIN', 'MAXIMINO', 'NORBERTO', 'OCTAVIO', 'OLIVERIO', 'ONOFRE',
    'PARMENIO', 'PASCUAL', 'PORFIRIO', 'PRIMITIVO', 'PROSPERO',
    'REYES', 'ROSENDO', 'SALOMON', 'SILVERIO', 'TEOFILO', 'TOBIAS',
    'UBALDO', 'ULISES', 'VALERIANO', 'VENANCIO', 'YEISON', 'BREYNER',
}

def inferir_genero(nombre_completo):
    """Infiere M/F del primer nombre."""
    if not nombre_completo:
        return ''
    nombre = nombre_completo.strip().upper().split()[0] if nombre_completo.strip() else ''
    if not nombre:
        return ''
    if nombre in NOMBRES_FEMENINOS:
        return 'F'
    if nombre in NOMBRES_MASCULINOS:
        return 'M'
    # Heurísticas por terminación
    if nombre.endswith('A') and nombre not in {'BORJA', 'GARCIA', 'MEJIA', 'SIERRA', 'PENA', 'PEÑA'}:
        return 'F'
    if nombre.endswith('O') or nombre.endswith('SON'):
        return 'M'
    return ''  # No se puede determinar

def normalizar_sexo(sexo_actual, nombre_refiere):
    """Normaliza SEXO existente o infiere por nombre."""
    s = sexo_actual.strip().upper() if sexo_actual else ''
    # Normalizar existentes
    if s in ('FEMENINO', 'F'):
        return 'F'
    if s in ('MASCULINO', 'M'):
        return 'M'
    # Si es null o vacío, inferir por nombre
    if s in ('', 'NULL', 'N/A'):
        return inferir_genero(nombre_refiere)
    return s  # Dejar lo que tenga si no matchea

# ============================================================
# 2. CONSOLIDACIÓN DE OBSERVACIONES → 7 categorías
# ============================================================
def consolidar_observaciones(obs):
    """Mapea ~79 valores a 7 categorías."""
    if not obs:
        return 'SIN OBSERVACION'
    o = obs.strip().upper()
    if not o or o == 'NULL' or o == 'N/A' or o == '0':
        return 'SIN OBSERVACION'

    # MENSAJE ENVIADO — variantes de envío de mensaje
    if any(kw in o for kw in ['ENVIO MENSAJE', 'ENVÍO MENSAJE', 'MENSAJE ENVIADO',
                               'MESAJE ENVIADO', 'ENVIADO MENSAJE', 'MANDO MENSAJE',
                               'MENSAJES ENVIADOS', 'ENVIO MENSAJES', 'ENVIAR INFORMACION',
                               'SE ENVIO', 'SE ENVÍO', 'SE MANDO']):
        return 'MENSAJE ENVIADO'

    # CONTACTADO / CONTESTÓ
    if any(kw in o for kw in ['CONTESTO', 'CONTESTÓ', 'LLAMADO', 'LLAMADA',
                               'YA SE LLAMO', 'YA SELLAMO', 'LLAMAR', 'LLAMO']):
        return 'CONTACTADO'

    # NO CONTESTA
    if any(kw in o for kw in ['NO CONTESTO', 'NO CONTESTÓ', 'NO CONTESTA',
                               'COLGO', 'COLGÓ', 'COLGARON', 'OCUPADA']):
        return 'NO CONTESTA'

    # NÚMERO INCORRECTO / FUERA DE SERVICIO
    if any(kw in o for kw in ['INCORRECTO', 'EQUIVOCADO', 'NO DISPONIBLE',
                               'FUERA DE SERVICIO', 'NO SIRVE', 'APAGADO',
                               'DESACTIVADO', 'DESATIVADO', 'NO EXISTE',
                               'NO ESTA EN SERVICIO', 'NO TIENE NUMERO',
                               'MAL ESCRITO', 'FALTA UN NUMERO']):
        return 'NUMERO INVALIDO'

    # NO LE INTERESA / NO CONOCE
    if any(kw in o for kw in ['NO LE INTERESA', 'NO INTERESA', 'DESCONOCE',
                               'NO LA CONOCEN', 'NO CONOCE', 'NO ASISTIO']):
        return 'NO INTERESADO'

    # VERIFICAR DATOS
    if any(kw in o for kw in ['VERIFICAR', 'REVISAR', 'TANDA', 'SIRVIERON']):
        return 'VERIFICAR DATOS'

    # Todo lo demás
    return 'OTROS'


# ============================================================
# PROCESAR CSV
# ============================================================
def main():
    rows = []
    with open(INPUT_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    print(f"📊 Filas leídas: {len(rows)}")

    # Contadores
    sexo_normalizado = 0
    sexo_inferido = 0
    sexo_sin_determinar = 0
    obs_consolidadas = 0

    for row in rows:
        # --- SEXO ---
        sexo_original = row.get('SEXO', '')
        nombre = row.get('A_QUIEN_REFIERE', '')
        nuevo_sexo = normalizar_sexo(sexo_original, nombre)

        s_orig = (sexo_original or '').strip().upper()
        if s_orig in ('FEMENINO', 'MASCULINO'):
            sexo_normalizado += 1
        elif s_orig in ('', 'NULL', 'N/A') and nuevo_sexo:
            sexo_inferido += 1
        elif not nuevo_sexo:
            sexo_sin_determinar += 1

        row['SEXO'] = nuevo_sexo

        # --- OBSERVACIONES ---
        obs_original = row.get('OBSERVACIONES', '')
        row['OBSERVACIONES'] = consolidar_observaciones(obs_original)
        if (obs_original or '').strip().upper() != row['OBSERVACIONES']:
            obs_consolidadas += 1

    # Escribir output
    with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n✅ Archivo guardado: {OUTPUT_FILE}")
    print(f"\n--- SEXO ---")
    print(f"  Normalizados (Femenino→F, Masculino→M): {sexo_normalizado}")
    print(f"  Inferidos por nombre: {sexo_inferido}")
    print(f"  Sin determinar (vacío): {sexo_sin_determinar}")
    print(f"\n--- OBSERVACIONES ---")
    print(f"  Consolidadas: {obs_consolidadas}")

    # Mostrar distribución final
    from collections import Counter
    sexo_dist = Counter(row['SEXO'] for row in rows)
    obs_dist = Counter(row['OBSERVACIONES'] for row in rows)

    print(f"\n📊 Distribución SEXO final:")
    for k, v in sexo_dist.most_common():
        print(f"  {k or '(vacío)'}: {v}")

    print(f"\n📊 Distribución OBSERVACIONES final:")
    for k, v in obs_dist.most_common():
        print(f"  {k}: {v}")

if __name__ == '__main__':
    main()

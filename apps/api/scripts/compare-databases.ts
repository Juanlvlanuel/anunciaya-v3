#!/usr/bin/env tsx
/**
 * 🔍 Script de Comparación de Bases de Datos
 * 
 * Compara tu base de datos LOCAL vs SUPABASE y muestra las diferencias:
 * - Tablas
 * - Columnas
 * - Índices
 * - Triggers
 * - Extensiones (PostGIS, uuid-ossp, etc)
 * - Foreign Keys
 * - Unique Constraints
 * 
 * USO:
 * pnpm tsx apps/api/scripts/compare-databases.ts
 * 
 * SALIDA:
 * - Muestra resultados en consola
 * - Genera reporte en: apps/api/reports/db-comparison-YYYY-MM-DD-HH-mm.md
 */

import pg from 'pg';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
config();

const { Pool } = pg;

// ====================================
// CONFIGURACIÓN
// ====================================

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const supabasePool = new Pool({
  connectionString: process.env.DATABASE_URL_PRODUCTION,
});

// ====================================
// REPORT BUILDER
// ====================================

class ReportBuilder {
  private content: string[] = [];
  private reportPath: string;

  constructor() {
    // Crear carpeta de reportes si no existe
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 16);
    this.reportPath = path.join(reportsDir, `db-comparison-${timestamp}.md`);
  }

  addTitle(text: string) {
    this.content.push(`# ${text}\n`);
  }

  addSection(text: string) {
    this.content.push(`\n${'='.repeat(60)}`);
    this.content.push(`## ${text}`);
    this.content.push(`${'='.repeat(60)}\n`);
  }

  addSubSection(text: string) {
    this.content.push(`\n${'─'.repeat(60)}`);
    this.content.push(`### ${text}`);
    this.content.push(`${'─'.repeat(60)}\n`);
  }

  addText(text: string) {
    this.content.push(text);
  }

  addList(items: string[], symbol: string = '-') {
    items.forEach(item => {
      this.content.push(`${symbol} ${item}`);
    });
  }

  addEmptyLine() {
    this.content.push('');
  }

  addCodeBlock(code: string, language: string = '') {
    this.content.push(`\`\`\`${language}`);
    this.content.push(code);
    this.content.push('```\n');
  }

  save(): string {
    const finalContent = this.content.join('\n');
    fs.writeFileSync(this.reportPath, finalContent, 'utf-8');
    return this.reportPath;
  }

  getPath(): string {
    return this.reportPath;
  }
}

// ====================================
// TIPOS
// ====================================

interface Table {
  table_name: string;
}

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface Index {
  indexname: string;
  indexdef: string;
}

interface Trigger {
  trigger_name: string;
  event_manipulation: string;
  action_statement: string;
}

interface Extension {
  extname: string;
  extversion: string;
}

interface ForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface Constraint {
  constraint_name: string;
  constraint_type: string;
  table_name: string;
}

// ====================================
// QUERIES
// ====================================

const QUERIES = {
  // Obtener todas las tablas (excluyendo tablas del sistema)
  tables: `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `,

  // Obtener columnas de una tabla
  columns: (tableName: string) => `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `,

  // Obtener índices de una tabla
  indexes: (tableName: string) => `
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' 
    AND tablename = '${tableName}'
    ORDER BY indexname;
  `,

  // Obtener triggers de una tabla
  triggers: (tableName: string) => `
    SELECT 
      trigger_name,
      event_manipulation,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' 
    AND event_object_table = '${tableName}'
    ORDER BY trigger_name;
  `,

  // Obtener extensiones instaladas
  extensions: `
    SELECT 
      extname,
      extversion
    FROM pg_extension
    WHERE extname NOT IN ('plpgsql')
    ORDER BY extname;
  `,

  // Obtener foreign keys
  foreignKeys: `
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `,

  // Obtener constraints (unique, check, etc)
  constraints: `
    SELECT 
      constraint_name,
      constraint_type,
      table_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND constraint_type IN ('UNIQUE', 'CHECK')
    ORDER BY table_name, constraint_name;
  `,
};

// ====================================
// FUNCIONES DE COMPARACIÓN
// ====================================

async function getTables(pool: pg.Pool): Promise<string[]> {
  const result = await pool.query<Table>(QUERIES.tables);
  return result.rows.map(row => row.table_name);
}

async function getColumns(pool: pg.Pool, tableName: string): Promise<Column[]> {
  const result = await pool.query<Column>(QUERIES.columns(tableName));
  return result.rows;
}

async function getIndexes(pool: pg.Pool, tableName: string): Promise<Index[]> {
  const result = await pool.query<Index>(QUERIES.indexes(tableName));
  return result.rows;
}

async function getTriggers(pool: pg.Pool, tableName: string): Promise<Trigger[]> {
  const result = await pool.query<Trigger>(QUERIES.triggers(tableName));
  return result.rows;
}

async function getExtensions(pool: pg.Pool): Promise<Extension[]> {
  const result = await pool.query<Extension>(QUERIES.extensions);
  return result.rows;
}

async function getForeignKeys(pool: pg.Pool): Promise<ForeignKey[]> {
  const result = await pool.query<ForeignKey>(QUERIES.foreignKeys);
  return result.rows;
}

async function getConstraints(pool: pg.Pool): Promise<Constraint[]> {
  const result = await pool.query<Constraint>(QUERIES.constraints);
  return result.rows;
}

// ====================================
// COMPARADORES
// ====================================

function compareArrays<T>(local: T[], supabase: T[], getName: (item: T) => string) {
  const localNames = new Set(local.map(getName));
  const supabaseNames = new Set(supabase.map(getName));

  const onlyLocal = local.filter(item => !supabaseNames.has(getName(item)));
  const onlySupabase = supabase.filter(item => !localNames.has(getName(item)));
  const inBoth = local.filter(item => supabaseNames.has(getName(item)));

  return { onlyLocal, onlySupabase, inBoth };
}

function printSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function printSubSection(title: string) {
  console.log('\n' + '-'.repeat(60));
  console.log(`  ${title}`);
  console.log('-'.repeat(60));
}

// ====================================
// MAIN
// ====================================

async function main() {
  console.log('🔍 Iniciando comparación de bases de datos...\n');
  
  // Inicializar el generador de reportes
  const report = new ReportBuilder();
  
  // Agregar encabezado del reporte
  report.addTitle('🔍 Reporte de Comparación de Bases de Datos');
  report.addText(`**Fecha:** ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
  report.addText(`**Proyecto:** AnunciaYA v3.0`);
  report.addText(`**Local:** PostgreSQL (localhost:5432)`);
  report.addText(`**Producción:** Supabase (PostgreSQL)`);
  report.addEmptyLine();

  try {
    // ====================================
    // 1. COMPARAR EXTENSIONES
    // ====================================
    printSection('📦 EXTENSIONES');
    report.addSection('📦 EXTENSIONES');

    const localExtensions = await getExtensions(localPool);
    const supabaseExtensions = await getExtensions(supabasePool);

    const extComparison = compareArrays(
      localExtensions,
      supabaseExtensions,
      ext => ext.extname
    );

    const extInBothText: string[] = [];
    console.log('\n✅ En ambas bases de datos:');
    report.addText('\n**✅ En ambas bases de datos:**\n');
    extComparison.inBoth.forEach(ext => {
      const localExt = localExtensions.find(e => e.extname === ext.extname)!;
      const supabaseExt = supabaseExtensions.find(e => e.extname === ext.extname)!;
      const versionMatch = localExt.extversion === supabaseExt.extversion;
      const line = `${ext.extname} (Local: v${localExt.extversion}, Supabase: v${supabaseExt.extversion}) ${versionMatch ? '✅' : '⚠️'}`;
      console.log(`  - ${line}`);
      extInBothText.push(line);
    });
    report.addList(extInBothText);
    report.addEmptyLine();

    if (extComparison.onlyLocal.length > 0) {
      const onlyLocalText = extComparison.onlyLocal.map(ext => `${ext.extname} (v${ext.extversion})`);
      console.log('\n⚠️  Solo en LOCAL:');
      report.addText('\n**⚠️ Solo en LOCAL:**\n');
      onlyLocalText.forEach(item => console.log(`  - ${item}`));
      report.addList(onlyLocalText);
      report.addEmptyLine();
    }

    if (extComparison.onlySupabase.length > 0) {
      const onlySupabaseText = extComparison.onlySupabase.map(ext => `${ext.extname} (v${ext.extversion})`);
      console.log('\n⚠️  Solo en SUPABASE:');
      report.addText('\n**⚠️ Solo en SUPABASE:**\n');
      onlySupabaseText.forEach(item => console.log(`  - ${item}`));
      report.addList(onlySupabaseText);
      report.addEmptyLine();
    }

    // ====================================
    // 2. COMPARAR TABLAS
    // ====================================
    printSection('📊 TABLAS');
    report.addSection('📊 TABLAS');

    const localTables = await getTables(localPool);
    const supabaseTables = await getTables(supabasePool);

    console.log(`\nLocal: ${localTables.length} tablas`);
    console.log(`Supabase: ${supabaseTables.length} tablas`);
    report.addText(`\n**Local:** ${localTables.length} tablas`);
    report.addText(`**Supabase:** ${supabaseTables.length} tablas`);
    report.addEmptyLine();

    const tableComparison = compareArrays(localTables, supabaseTables, t => t);

    if (tableComparison.onlyLocal.length > 0) {
      console.log('\n⚠️  Tablas solo en LOCAL:');
      report.addText('\n**⚠️ Tablas solo en LOCAL:**\n');
      tableComparison.onlyLocal.forEach(table => {
        console.log(`  - ${table}`);
      });
      report.addList(tableComparison.onlyLocal);
      report.addEmptyLine();
    }

    if (tableComparison.onlySupabase.length > 0) {
      console.log('\n⚠️  Tablas solo en SUPABASE:');
      report.addText('\n**⚠️ Tablas solo en SUPABASE:**\n');
      tableComparison.onlySupabase.forEach(table => {
        console.log(`  - ${table}`);
      });
      report.addList(tableComparison.onlySupabase);
      report.addEmptyLine();
    }

    console.log(`\n✅ Tablas en ambas: ${tableComparison.inBoth.length}`);
    report.addText(`\n**✅ Tablas en ambas:** ${tableComparison.inBoth.length}`);
    report.addEmptyLine();

    // ====================================
    // 3. COMPARAR COLUMNAS (solo tablas en común)
    // ====================================
    printSection('🔠 COLUMNAS');
    report.addSection('🔠 COLUMNAS');

    let columnDifferences = 0;

    for (const tableName of tableComparison.inBoth) {
      const localColumns = await getColumns(localPool, tableName);
      const supabaseColumns = await getColumns(supabasePool, tableName);

      const columnComparison = compareArrays(
        localColumns,
        supabaseColumns,
        col => col.column_name
      );

      if (columnComparison.onlyLocal.length > 0 || columnComparison.onlySupabase.length > 0) {
        printSubSection(tableName);
        report.addSubSection(tableName);
        columnDifferences++;

        if (columnComparison.onlyLocal.length > 0) {
          const onlyLocalCols = columnComparison.onlyLocal.map(col => `${col.column_name} (${col.data_type})`);
          console.log('\n  ⚠️  Columnas solo en LOCAL:');
          report.addText('\n**⚠️ Columnas solo en LOCAL:**\n');
          onlyLocalCols.forEach(col => console.log(`    - ${col}`));
          report.addList(onlyLocalCols);
          report.addEmptyLine();
        }

        if (columnComparison.onlySupabase.length > 0) {
          const onlySupabaseCols = columnComparison.onlySupabase.map(col => `${col.column_name} (${col.data_type})`);
          console.log('\n  ⚠️  Columnas solo en SUPABASE:');
          report.addText('\n**⚠️ Columnas solo en SUPABASE:**\n');
          onlySupabaseCols.forEach(col => console.log(`    - ${col}`));
          report.addList(onlySupabaseCols);
          report.addEmptyLine();
        }
      }
    }

    if (columnDifferences === 0) {
      console.log('\n✅ Todas las columnas coinciden en las tablas comunes');
      report.addText('\n**✅ Todas las columnas coinciden en las tablas comunes**');
      report.addEmptyLine();
    }

    // ====================================
    // 4. COMPARAR ÍNDICES
    // ====================================
    printSection('📇 ÍNDICES');
    report.addSection('📇 ÍNDICES');

    let indexDifferences = 0;

    for (const tableName of tableComparison.inBoth) {
      const localIndexes = await getIndexes(localPool, tableName);
      const supabaseIndexes = await getIndexes(supabasePool, tableName);

      const indexComparison = compareArrays(
        localIndexes,
        supabaseIndexes,
        idx => idx.indexname
      );

      if (indexComparison.onlyLocal.length > 0 || indexComparison.onlySupabase.length > 0) {
        printSubSection(tableName);
        report.addSubSection(tableName);
        indexDifferences++;

        if (indexComparison.onlyLocal.length > 0) {
          const onlyLocalIdx = indexComparison.onlyLocal.map(idx => idx.indexname);
          console.log('\n  ⚠️  Índices solo en LOCAL:');
          report.addText('\n**⚠️ Índices solo en LOCAL:**\n');
          onlyLocalIdx.forEach(idx => console.log(`    - ${idx}`));
          report.addList(onlyLocalIdx);
          report.addEmptyLine();
        }

        if (indexComparison.onlySupabase.length > 0) {
          const onlySupabaseIdx = indexComparison.onlySupabase.map(idx => idx.indexname);
          console.log('\n  ⚠️  Índices solo en SUPABASE:');
          report.addText('\n**⚠️ Índices solo en SUPABASE:**\n');
          onlySupabaseIdx.forEach(idx => console.log(`    - ${idx}`));
          report.addList(onlySupabaseIdx);
          report.addEmptyLine();
        }
      }
    }

    if (indexDifferences === 0) {
      console.log('\n✅ Todos los índices coinciden en las tablas comunes');
      report.addText('\n**✅ Todos los índices coinciden en las tablas comunes**');
      report.addEmptyLine();
    }

    // ====================================
    // 5. COMPARAR TRIGGERS
    // ====================================
    printSection('⚡ TRIGGERS');
    report.addSection('⚡ TRIGGERS');

    let triggerDifferences = 0;

    for (const tableName of tableComparison.inBoth) {
      const localTriggers = await getTriggers(localPool, tableName);
      const supabaseTriggers = await getTriggers(supabasePool, tableName);

      const triggerComparison = compareArrays(
        localTriggers,
        supabaseTriggers,
        trg => trg.trigger_name
      );

      if (triggerComparison.onlyLocal.length > 0 || triggerComparison.onlySupabase.length > 0) {
        printSubSection(tableName);
        report.addSubSection(tableName);
        triggerDifferences++;

        if (triggerComparison.onlyLocal.length > 0) {
          const onlyLocalTrg = triggerComparison.onlyLocal.map(trg => `${trg.trigger_name} (${trg.event_manipulation})`);
          console.log('\n  ⚠️  Triggers solo en LOCAL:');
          report.addText('\n**⚠️ Triggers solo en LOCAL:**\n');
          onlyLocalTrg.forEach(trg => console.log(`    - ${trg}`));
          report.addList(onlyLocalTrg);
          report.addEmptyLine();
        }

        if (triggerComparison.onlySupabase.length > 0) {
          const onlySupabaseTrg = triggerComparison.onlySupabase.map(trg => `${trg.trigger_name} (${trg.event_manipulation})`);
          console.log('\n  ⚠️  Triggers solo en SUPABASE:');
          report.addText('\n**⚠️ Triggers solo en SUPABASE:**\n');
          onlySupabaseTrg.forEach(trg => console.log(`    - ${trg}`));
          report.addList(onlySupabaseTrg);
          report.addEmptyLine();
        }
      }
    }

    if (triggerDifferences === 0) {
      console.log('\n✅ Todos los triggers coinciden en las tablas comunes');
      report.addText('\n**✅ Todos los triggers coinciden en las tablas comunes**');
      report.addEmptyLine();
    }

    // ====================================
    // 6. COMPARAR FOREIGN KEYS
    // ====================================
    printSection('🔗 FOREIGN KEYS');
    report.addSection('🔗 FOREIGN KEYS');

    const localForeignKeys = await getForeignKeys(localPool);
    const supabaseForeignKeys = await getForeignKeys(supabasePool);

    const fkComparison = compareArrays(
      localForeignKeys,
      supabaseForeignKeys,
      fk => `${fk.table_name}.${fk.constraint_name}`
    );

    if (fkComparison.onlyLocal.length > 0) {
      const onlyLocalFk = fkComparison.onlyLocal.map(fk => 
        `${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`
      );
      console.log('\n⚠️  Foreign Keys solo en LOCAL:');
      report.addText('\n**⚠️ Foreign Keys solo en LOCAL:**\n');
      onlyLocalFk.forEach(fk => console.log(`  - ${fk}`));
      report.addList(onlyLocalFk);
      report.addEmptyLine();
    }

    if (fkComparison.onlySupabase.length > 0) {
      const onlySupabaseFk = fkComparison.onlySupabase.map(fk => 
        `${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`
      );
      console.log('\n⚠️  Foreign Keys solo en SUPABASE:');
      report.addText('\n**⚠️ Foreign Keys solo en SUPABASE:**\n');
      onlySupabaseFk.forEach(fk => console.log(`  - ${fk}`));
      report.addList(onlySupabaseFk);
      report.addEmptyLine();
    }

    console.log(`\n✅ Foreign Keys en ambas: ${fkComparison.inBoth.length}`);
    report.addText(`\n**✅ Foreign Keys en ambas:** ${fkComparison.inBoth.length}`);
    report.addEmptyLine();

    // ====================================
    // 7. COMPARAR CONSTRAINTS
    // ====================================
    printSection('🔒 CONSTRAINTS (UNIQUE, CHECK)');
    report.addSection('🔒 CONSTRAINTS (UNIQUE, CHECK)');

    const localConstraints = await getConstraints(localPool);
    const supabaseConstraints = await getConstraints(supabasePool);

    const constraintComparison = compareArrays(
      localConstraints,
      supabaseConstraints,
      c => `${c.table_name}.${c.constraint_name}`
    );

    if (constraintComparison.onlyLocal.length > 0) {
      const onlyLocalConst = constraintComparison.onlyLocal.map(c => 
        `${c.table_name}.${c.constraint_name} (${c.constraint_type})`
      );
      console.log('\n⚠️  Constraints solo en LOCAL:');
      report.addText('\n**⚠️ Constraints solo en LOCAL:**\n');
      onlyLocalConst.forEach(c => console.log(`  - ${c}`));
      report.addList(onlyLocalConst);
      report.addEmptyLine();
    }

    if (constraintComparison.onlySupabase.length > 0) {
      const onlySupabaseConst = constraintComparison.onlySupabase.map(c => 
        `${c.table_name}.${c.constraint_name} (${c.constraint_type})`
      );
      console.log('\n⚠️  Constraints solo en SUPABASE:');
      report.addText('\n**⚠️ Constraints solo en SUPABASE:**\n');
      onlySupabaseConst.forEach(c => console.log(`  - ${c}`));
      report.addList(onlySupabaseConst);
      report.addEmptyLine();
    }

    console.log(`\n✅ Constraints en ambas: ${constraintComparison.inBoth.length}`);
    report.addText(`\n**✅ Constraints en ambas:** ${constraintComparison.inBoth.length}`);
    report.addEmptyLine();

    // ====================================
    // RESUMEN FINAL
    // ====================================
    printSection('📋 RESUMEN');
    report.addSection('📋 RESUMEN');

    const totalDifferences = 
      extComparison.onlyLocal.length + extComparison.onlySupabase.length +
      tableComparison.onlyLocal.length + tableComparison.onlySupabase.length +
      columnDifferences +
      indexDifferences +
      triggerDifferences +
      fkComparison.onlyLocal.length + fkComparison.onlySupabase.length +
      constraintComparison.onlyLocal.length + constraintComparison.onlySupabase.length;

    if (totalDifferences === 0) {
      console.log('\n✅ ¡Las bases de datos son IDÉNTICAS!');
      report.addText('\n**✅ ¡Las bases de datos son IDÉNTICAS!**');
      report.addEmptyLine();
    } else {
      console.log(`\n⚠️  Se encontraron ${totalDifferences} diferencias`);
      console.log('\nDiferencias por categoría:');
      console.log(`  - Extensiones: ${extComparison.onlyLocal.length + extComparison.onlySupabase.length}`);
      console.log(`  - Tablas: ${tableComparison.onlyLocal.length + tableComparison.onlySupabase.length}`);
      console.log(`  - Columnas: ${columnDifferences} tablas con diferencias`);
      console.log(`  - Índices: ${indexDifferences} tablas con diferencias`);
      console.log(`  - Triggers: ${triggerDifferences} tablas con diferencias`);
      console.log(`  - Foreign Keys: ${fkComparison.onlyLocal.length + fkComparison.onlySupabase.length}`);
      console.log(`  - Constraints: ${constraintComparison.onlyLocal.length + constraintComparison.onlySupabase.length}`);

      report.addText(`\n**⚠️ Se encontraron ${totalDifferences} diferencias**`);
      report.addEmptyLine();
      report.addText('**Diferencias por categoría:**\n');
      report.addList([
        `Extensiones: ${extComparison.onlyLocal.length + extComparison.onlySupabase.length}`,
        `Tablas: ${tableComparison.onlyLocal.length + tableComparison.onlySupabase.length}`,
        `Columnas: ${columnDifferences} tablas con diferencias`,
        `Índices: ${indexDifferences} tablas con diferencias`,
        `Triggers: ${triggerDifferences} tablas con diferencias`,
        `Foreign Keys: ${fkComparison.onlyLocal.length + fkComparison.onlySupabase.length}`,
        `Constraints: ${constraintComparison.onlyLocal.length + constraintComparison.onlySupabase.length}`
      ]);
      report.addEmptyLine();
    }

    console.log('\n✅ Comparación completada\n');

    // ====================================
    // GUARDAR REPORTE
    // ====================================
    const reportPath = report.save();
    console.log(`📄 Reporte guardado en: ${reportPath}\n`);

  } catch (error) {
    console.error('\n❌ Error durante la comparación:', error);
    report.addSection('❌ ERROR');
    report.addText(`\nOcurrió un error durante la comparación:\n`);
    report.addCodeBlock(String(error));
    report.save();
    process.exit(1);
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

// Ejecutar
main();
/**
 * Format adapters for translation file parsing and serialization.
 *
 * Each adapter implements {@link IFormatAdapter} and handles a specific
 * file format. Adapters are stateless and safe for concurrent use.
 *
 * @module adapters/format
 */

export { JsonFlatAdapter } from './json-flat.adapter';
export { JsonNestedAdapter } from './json-nested.adapter';
export { YamlAdapter } from './yaml.adapter';
export { PoAdapter } from './po.adapter';
export { XliffAdapter } from './xliff.adapter';
export { AndroidXmlAdapter } from './android-xml.adapter';
export { IosStringsAdapter } from './ios-strings.adapter';

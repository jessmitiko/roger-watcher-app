function transform(params, structureParams, tool) {
    let transformedParams = params.toString();

    if(structureParams.includes('item_id')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+id)|(pr\d+id)/g, 'item_id');
    }
    if(structureParams.includes('price')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+pr)|(pr\d+pr)/g, 'price');
    }
    if(structureParams.includes('item_name')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+nm)|(pr\d+nm)/g, 'item_name');
    }
    if(structureParams.includes('item_category')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+ca)|(pr\d+ca)/g, 'item_category');
    }
    if(structureParams.includes('item_brand')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+br)|(pr\d+br)/g, 'item_brand');
    }
    if(structureParams.includes('index')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+ps)|(pr\d+ps)/g, 'index');
    }
    if(structureParams.includes('dimension4')) {
        transformedParams = transformedParams.replace(/(il\d+pi\d+cd4)|(pr\d+cd4)/g, 'dimension4');
    }
    if(structureParams.includes('item_list')) {
        transformedParams = transformedParams.replace(/il\d+nm/g, 'item_list');
    }
    // if(structureParams.includes('quantity')) {
    //    transformedParams = transformedParams.replace(/pr\d+qt/g, 'quantity');
    // }

    // remove control events and some custom dimensions
    transformedParams = transformedParams.replace(/(_s|_v|ht|(?<!\w)a(id|n|v|)|cd([0-9]|)|c(id|m|s)|ni|sr|(?<!\w)t|tid|uid|ul|e(a|c)),|(?<!\w)v/g, ''); // miora depois

    transformedParams = transformedParams.split(',');
    if(transformedParams[transformedParams.length-1] == '') transformedParams.pop();

    return transformedParams;
}

module.exports = function(msg, structure) {
    const virtualPath = (msg.tool == 'google_analytics') ? msg.data.cd : msg.data.ga_screen;
    const name = (msg.tool == 'google_analytics') ? msg.data.ea : msg.data.ga_event_name;
    // toddos eventos existentes em certa página
    const [ events ] = structure.filter(event => event.screenName == virtualPath && event[name]);

    if(events) {
        // se event for undefined ou vazio o evento disparado não existe na estrutura
        const event = events[name], nonExistentParams = [];
        const structureParams = Object.keys(event), toolParams = new Set(transform(Object.keys(msg.data), structureParams, msg.tool));

        // console.log(toolParams, structureParams);

        if(msg.tool == 'google_analytics') {
            structureParams.forEach(param => {
                if(!toolParams.delete(param)) nonExistentParams.push(param); // verificar tipo e formato
            });

            // printar o log
            if(Array.from(toolParams).length > 0) console.log(`os parametros ${Array.from(toolParams)} (${msg.data.cd}) de ${name} aparecem no hit, mas não no mapa de coleta`);
            if(nonExistentParams.length > 0) console.log(`${nonExistentParams} de ${name} (${msg.data.cd}) não existe nos logs do GA`);
        }
    }
}

console.log('In validation ', module);
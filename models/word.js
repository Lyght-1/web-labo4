module.exports = 
class Word{
    constructor(word, definition)
    {
        this.id = 0;
        this.word = word !== undefined ? word : "";
        this.Definition = definition !== undefined ? definition : "";
    }

    static valid(instance) {
        const Validator = new require('./validator');
        let validator = new Validator();
        validator.addField('id','integer');
        validator.addField('word','string');
        validator.addField('Definition','string');
        return validator.test(instance);
    }
}
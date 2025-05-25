import { newDocument } from './newDocument';
import newReporter from './newReporter';
import { defaultPublisherOptions } from '../src/constants';
import { getDefaultSettings } from './settingsHelper';

import { Publisher } from './publisher';
import StateFactory from './parsers/rst/stateFactory';
import RSTStateMachine from './parsers/rst/rstStateMachine';
import { Document, LoggerType, ReporterInterface } from './types';
import { Logger } from './logger';

let _logger: LoggerType | undefined;

export function createLogger(options?: any): LoggerType {
    return new Logger(options);
}

export function createPublisher(): Publisher {
    const publisher = new Publisher({ ...defaultPublisherOptions, logger: createLogger() });
    publisher.setComponents(defaultPublisherOptions.readerName, defaultPublisherOptions.parserName, 'xml');
    return publisher;
}

export function createRSTStateMachine(args: { logger: LoggerType }): RSTStateMachine {
    const sm = new RSTStateMachine({
        stateFactory: new StateFactory({ logger: args.logger }),
        initialState: 'Body',
        debugFn: args.logger.debug.bind(args.logger),
        debug: true,
        logger: args.logger,
    });
    return sm;
}

export function createStateFactory(): StateFactory {
    return new StateFactory({ logger: createLogger() });
}

export function createNewDocument(sourcePath: string = 'default'): Document {
    return newDocument({ sourcePath, logger: createLogger() }, getDefaultSettings());
}

export function createNewReporter(sourcePath: string = 'default'): ReporterInterface {
    return newReporter({ sourcePath }, getDefaultSettings());
}
